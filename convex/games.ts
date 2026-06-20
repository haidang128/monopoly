/**
 * Online game functions (Milestone 3) — the authoritative server runtime.
 *
 * The architectural keystone: these mutations run the **exact same**
 * `@monopoly/engine` reducer that pass-and-play runs on-device, so one rule set
 * drives both modes and a tampered client cannot fabricate dice or money. The
 * client sends *actions, not state*; the server validates the seat, reduces, and
 * persists the new `GameState`. A reactive `getByCode` query broadcasts it.
 *
 * Engine is imported by relative path (not the `@monopoly/engine` alias, which
 * only exists for Metro/tsc) so Convex's bundler picks up the pure-TS source.
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';

import {
  createGame,
  reduce,
  type Action,
  type GameState,
  type HouseRules,
  type PlayerId,
  type PlayerSetup,
} from '../packages/engine/src/index';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

/**
 * The authenticated caller's stable user id, derived server-side. NEVER trust a
 * client-supplied identifier for authorization — that's the whole point of the
 * Milestone 4 security fix. Throws if the caller isn't signed in (the client
 * signs in anonymously on launch, so this should always resolve in practice).
 */
async function requireUserId(ctx: MutationCtx | QueryCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError('Not signed in');
  return userId;
}

/** Unambiguous code alphabet (no 0/O/1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 4;
const MAX_SEATS = 6;
/** How long a player has to act before the turn auto-resolves. */
const TURN_MS = 60_000;

/**
 * Token palette — colors are assigned **server-side** so every seat in a room is
 * guaranteed a distinct color (a client can't pick a clashing one). Mirrors the
 * client palette used for pass-and-play swatches.
 */
const SEAT_COLORS = ['#B23A2C', '#1565A8', '#C49A48', '#2E7D5B', '#E07A1F', '#7A4F9A'];

/** First palette color not already taken by a seat (falls back by index). */
function assignColor(seats: { token: string }[]): string {
  const used = new Set(seats.map((s) => s.token));
  return SEAT_COLORS.find((c) => !used.has(c)) ?? SEAT_COLORS[seats.length % SEAT_COLORS.length];
}

function randomCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

async function findByCode(ctx: QueryCtx, code: string) {
  return ctx.db
    .query('games')
    .withIndex('by_code', (q) => q.eq('code', code.toUpperCase()))
    .first();
}

/** Whose input the game is waiting on (auction bidder, debtor, else current). */
function actingPlayer(state: GameState): PlayerId | null {
  if (state.phase === 'auction' && state.auction) {
    return state.auction.active[state.auction.turn] ?? null;
  }
  if (state.phase === 'mustResolveDebt' && state.debt) return state.debt.from;
  return state.order[state.current] ?? null;
}

/** The action used to auto-advance a stalled turn — a non-stalling default per phase. */
function defaultActionFor(state: GameState): Action | null {
  const player = actingPlayer(state);
  if (!player) return null;
  switch (state.phase) {
    case 'preRoll':
      return { type: 'ROLL', player };
    case 'awaitBuy':
      return { type: 'DECLINE_BUY', player };
    case 'turnEnd':
      return { type: 'END_TURN', player };
    case 'jailOptions':
      return { type: 'JAIL_ROLL', player };
    case 'auction':
      return { type: 'AUCTION_PASS', player };
    case 'mustResolveDebt':
      return { type: 'DECLARE_BANKRUPTCY', player }; // forfeit on timeout
    default:
      return null;
  }
}

/**
 * Persist a new authoritative state and (re)arm the turn timer: cancel any
 * pending `expireTurn`, and if the game is still awaiting input, schedule a fresh
 * one. Used by both human `dispatch` and the timer's own `expireTurn`.
 */
async function commitState(ctx: MutationCtx, game: Doc<'games'>, next: GameState): Promise<void> {
  if (game.timerJobId) await ctx.scheduler.cancel(game.timerJobId);

  const finished = next.phase === 'gameOver';
  let turnDeadline: number | null = null;
  let timerJobId: Id<'_scheduled_functions'> | null = null;
  if (!finished) {
    turnDeadline = Date.now() + TURN_MS;
    timerJobId = await ctx.scheduler.runAt(turnDeadline, internal.games.expireTurn, {
      gameId: game._id,
      deadline: turnDeadline,
    });
  }

  await ctx.db.patch(game._id, {
    state: next,
    phase: next.phase,
    status: finished ? 'finished' : 'active',
    lastActionAt: Date.now(),
    turnDeadline,
    timerJobId,
  });
}

/** Create a room in the lobby with the host as seat 1. Returns the join code. */
export const createRoom = mutation({
  args: {
    host: v.object({ name: v.string() }),
  },
  handler: async (ctx, { host }) => {
    const userId = await requireUserId(ctx);
    let code = randomCode();
    for (let tries = 0; tries < 8; tries++) {
      const clash = await findByCode(ctx, code);
      if (!clash) break;
      code = randomCode();
    }
    await ctx.db.insert('games', {
      code,
      status: 'lobby',
      hostId: userId,
      seats: [{ playerId: 'p1', name: host.name, token: SEAT_COLORS[0], identityId: userId }],
      state: null,
      phase: null,
      lastActionAt: Date.now(),
      turnDeadline: null,
    });
    return { code, playerId: 'p1' };
  },
});

/** Claim the next open seat in a lobby. Returns the assigned engine PlayerId. */
export const joinRoom = mutation({
  args: {
    code: v.string(),
    player: v.object({ name: v.string() }),
  },
  handler: async (ctx, { code, player }) => {
    const userId = await requireUserId(ctx);
    const game = await findByCode(ctx, code);
    if (!game) throw new ConvexError('Room not found');
    if (game.status !== 'lobby') throw new ConvexError('Game already started');

    // Idempotent rejoin: if this identity already holds a seat, return it.
    const existing = game.seats.find((s) => s.identityId === userId);
    if (existing) return { code: game.code, playerId: existing.playerId };

    if (game.seats.length >= MAX_SEATS) throw new ConvexError('Room is full');

    const playerId = `p${game.seats.length + 1}`;
    const token = assignColor(game.seats);
    await ctx.db.patch(game._id, {
      seats: [...game.seats, { playerId, name: player.name, token, identityId: userId }],
      lastActionAt: Date.now(),
    });
    return { code: game.code, playerId };
  },
});

/**
 * Non-host leaves a lobby: drop their seat and recompact the remaining
 * `playerId`s so they stay sequential (`p1..pn`) for the next join. Only valid
 * before the game starts — the host disbands instead (see `disbandRoom`).
 */
export const leaveRoom = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUserId(ctx);
    const game = await findByCode(ctx, code);
    if (!game) return;
    if (game.status !== 'lobby') throw new ConvexError('Game already started');
    if (game.hostId === userId) throw new ConvexError('The host must disband the room');

    const remaining = game.seats.filter((s) => s.identityId !== userId);
    if (remaining.length === game.seats.length) return; // wasn't seated

    const seats = remaining.map((s, i) => ({ ...s, playerId: `p${i + 1}` }));
    await ctx.db.patch(game._id, { seats, lastActionAt: Date.now() });
  },
});

/** Host-only: snapshot the lobby into a fresh authoritative game. */
export const startGame = mutation({
  args: { code: v.string(), rules: v.optional(v.any()) },
  handler: async (ctx, { code, rules }) => {
    const userId = await requireUserId(ctx);
    const game = await findByCode(ctx, code);
    if (!game) throw new ConvexError('Room not found');
    if (game.hostId !== userId) throw new ConvexError('Only the host can start');
    if (game.status !== 'lobby') throw new ConvexError('Game already started');
    if (game.seats.length < 2) throw new ConvexError('Need at least 2 players');

    const setups: PlayerSetup[] = game.seats.map((s) => ({
      id: s.playerId,
      name: s.name,
      token: s.token,
    }));
    const seed = Date.now();
    const state = createGame(setups, (rules ?? {}) as Partial<HouseRules>, seed);
    await ctx.db.patch(game._id, { rules, seed });
    await commitState(ctx, game, state); // sets state/phase/status + arms the timer
  },
});

/**
 * The keystone: validate the actor's seat, run the engine, persist the result.
 * Illegal/out-of-turn actions surface as a `ConvexError` the client can show.
 */
export const dispatch = mutation({
  args: { code: v.string(), action: v.any() },
  handler: async (ctx, { code, action }) => {
    const userId = await requireUserId(ctx);
    const game = await findByCode(ctx, code);
    if (!game) throw new ConvexError('Room not found');
    if (game.status !== 'active' || !game.state) throw new ConvexError('Game is not active');

    const act = action as Action;
    const seat = game.seats.find((s) => s.playerId === act.player);
    if (!seat || seat.identityId !== userId) throw new ConvexError('Not your seat');

    let next: GameState;
    try {
      next = reduce(game.state as GameState, act);
    } catch (e) {
      throw new ConvexError(e instanceof Error ? e.message : 'Illegal action');
    }

    await commitState(ctx, game, next);
  },
});

/**
 * Turn timer: auto-resolves a stalled turn one step at a time, then re-arms.
 * Scheduled by `commitState`; a stale firing (a newer action moved the deadline)
 * no-ops via the `deadline` guard.
 */
export const expireTurn = internalMutation({
  args: { gameId: v.id('games'), deadline: v.number() },
  handler: async (ctx, { gameId, deadline }) => {
    const game = await ctx.db.get(gameId);
    if (!game || game.status !== 'active' || !game.state) return;
    if (game.turnDeadline !== deadline) return; // superseded by a newer action/timer

    const action = defaultActionFor(game.state as GameState);
    if (!action) return;
    let next: GameState;
    try {
      next = reduce(game.state as GameState, action);
    } catch {
      return; // leave state untouched if the default action is somehow illegal
    }
    await commitState(ctx, game, next);
  },
});

/** Host disband: cancel the turn timer and delete the room. */
export const disbandRoom = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUserId(ctx);
    const game = await findByCode(ctx, code);
    if (!game) return;
    if (game.hostId !== userId) throw new ConvexError('Only the host can disband');
    if (game.timerJobId) await ctx.scheduler.cancel(game.timerJobId);
    await ctx.db.delete(game._id);
  },
});

/** The caller's authenticated user id (or null), so the client can find its seat. */
export const myId = query({
  args: {},
  handler: async (ctx) => await getAuthUserId(ctx),
});

/** Richer identity for UI: whether the caller is still a guest (anonymous) + name. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return { userId, isAnonymous: user?.isAnonymous ?? false, name: user?.name ?? null };
  },
});

/** Reactive room subscription — the client's window into authoritative state. */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const game = await findByCode(ctx, code);
    if (!game) return null;
    return {
      code: game.code,
      status: game.status,
      hostId: game.hostId,
      seats: game.seats,
      state: game.state as GameState | null,
      phase: game.phase,
      turnDeadline: game.turnDeadline,
    };
  },
});
