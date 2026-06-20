/**
 * Convex schema for online play (Milestone 3).
 *
 * One row per room. The authoritative `GameState` from `@monopoly/engine` lives
 * in `state` (stored as-is — the engine is the single source of truth, the same
 * one pass-and-play runs on-device). `phase` mirrors `state.phase` so lobby lists
 * and turn UI can read it without deserializing the whole game.
 */
import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/** A reserved seat in a room. `playerId` is the stable engine `PlayerId`. */
export const seatValidator = v.object({
  playerId: v.string(),
  name: v.string(),
  token: v.string(),
  /** Who controls this seat (guest device id or, later, an account). */
  identityId: v.union(v.string(), v.null()),
});

export default defineSchema({
  // Convex Auth tables (users, sessions, accounts, …) — guest identities live here.
  ...authTables,
  games: defineTable({
    /** Short, shareable join code (e.g. "Q7KD"). */
    code: v.string(),
    status: v.union(v.literal('lobby'), v.literal('active'), v.literal('finished')),
    /** Identity that created the room (the only one allowed to start it). */
    hostId: v.string(),
    seats: v.array(seatValidator),
    /** Lobby choices, applied at `start`. `v.any()` = Partial<HouseRules>. */
    rules: v.optional(v.any()),
    seed: v.optional(v.number()),
    /** Authoritative engine GameState; null until the host starts. */
    state: v.union(v.any(), v.null()),
    /** Mirror of `state.phase` for cheap querying; null in the lobby. */
    phase: v.union(v.string(), v.null()),
    lastActionAt: v.number(),
    /** Epoch ms the current turn auto-resolves; null when no turn is pending. */
    turnDeadline: v.union(v.number(), v.null()),
    /** Scheduled `expireTurn` job for the current turn (so it can be cancelled). */
    timerJobId: v.optional(v.union(v.id('_scheduled_functions'), v.null())),
  }).index('by_code', ['code']),
});
