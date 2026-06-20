/**
 * Pass-and-play game store (the on-device runtime of the engine).
 *
 * This is the **authoritative game-state tier** for local play: it wraps the
 * pure `@monopoly/engine` reducer, the single source of truth. The online mode
 * (Milestone 3) gets its authoritative state from Convex instead — but both
 * read the same `GameState` shape and dispatch the same `Action`s, so screens
 * are written once.
 *
 * Keep UI-only state (selected tile, open sheet, animation flags) OUT of this
 * store — that belongs in an ephemeral UI store. Never mirror server data here.
 *
 * Components subscribe via the selector hooks at the bottom so a dice animation
 * doesn't re-render the whole board.
 */
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import {
  type Action,
  type GameState,
  type HouseRules,
  type PlayerSetup,
  createGame,
  reduce,
} from '@monopoly/engine';
import { track } from '@/services/analytics';
import { sound } from '@/services/sound';
import {
  clearPassAndPlay,
  loadPassAndPlay,
  savePassAndPlay,
} from '@/services/storage';

interface GameStore {
  state: GameState | null;
  /** Last engine error (e.g. an illegal action), surfaced to the UI. */
  lastError: string | null;

  start: (players: PlayerSetup[], rules?: Partial<HouseRules>, seed?: number) => void;
  dispatch: (action: Action) => void;
  resume: () => boolean;
  reset: () => void;
}

export const usePassAndPlayStore = create<GameStore>((set, get) => ({
  state: null,
  lastError: null,

  start: (players, rules, seed = Date.now()) => {
    const state = createGame(players, rules, seed);
    set({ state, lastError: null });
    savePassAndPlay(state);
    track({ name: 'game_started', mode: 'passAndPlay', players: players.length });
  },

  dispatch: (action) => {
    const current = get().state;
    if (!current) return;
    try {
      const next = reduce(current, action);
      set({ state: next, lastError: null });
      savePassAndPlay(next);
      emitDerivedEvents(action, current, next);
    } catch (err) {
      // Illegal/out-of-turn action: surface it, keep the last valid state.
      set({ lastError: err instanceof Error ? err.message : String(err) });
    }
  },

  resume: () => {
    const saved = loadPassAndPlay();
    if (!saved) return false;
    set({ state: saved, lastError: null });
    return true;
  },

  reset: () => {
    clearPassAndPlay();
    set({ state: null, lastError: null });
  },
}));

/** Fire analytics + SFX for notable transitions, centralized off the dispatch path. */
function emitDerivedEvents(action: Action, prev: GameState, next: GameState): void {
  if (action.type === 'ROLL' && !prev.dice && next.dice) {
    track({ name: 'first_roll', mode: 'passAndPlay' });
  }
  if (action.type === 'BUY') track({ name: 'property_bought' });
  if (action.type === 'PROPOSE_TRADE') track({ name: 'trade_sent' });
  if (next.phase === 'gameOver' && prev.phase !== 'gameOver') {
    track({ name: 'game_completed', mode: 'passAndPlay', turns: next.turnId });
  }

  // --- sound cues (no-op until assets are registered in services/sound) ---
  if ((action.type === 'ROLL' || action.type === 'JAIL_ROLL') && next.dice !== prev.dice) {
    sound.roll();
  }
  if (action.type === 'BUY') sound.buy();
  if ((next.lastCard?.draw ?? 0) !== (prev.lastCard?.draw ?? 0)) sound.card();
  if (action.type === 'RESPOND_TRADE' && action.accept && !next.pendingTrade) sound.trade();
  if (next.phase === 'gameOver' && prev.phase !== 'gameOver') sound.win();
}

// --- selector hooks (subscribe to slices, not the whole store) --------------

export const useGameState = () => usePassAndPlayStore((s) => s.state);
export const useGamePhase = () => usePassAndPlayStore((s) => s.state?.phase ?? null);
export const useGameError = () => usePassAndPlayStore((s) => s.lastError);
export const useGameActions = () =>
  usePassAndPlayStore(
    // useShallow: the action fns are stable, but the wrapper object is new each
    // render — without a shallow compare, zustand v5's useSyncExternalStore sees
    // a "changed" snapshot every time and loops ("Maximum update depth exceeded").
    useShallow((s) => ({ start: s.start, dispatch: s.dispatch, resume: s.resume, reset: s.reset })),
  );

export const useCurrentPlayer = () =>
  usePassAndPlayStore((s) => {
    const st = s.state;
    if (!st) return null;
    return st.players.find((p) => p.id === st.order[st.current]) ?? null;
  });
