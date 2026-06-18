/**
 * Online backend seam (Convex) — placeholder until Milestone 3.
 *
 * Intentionally tiny and dependency-free for now. The contract the rest of the
 * app codes against: send **actions, not state**. The client dispatches intents
 * (`{ type: 'ROLL' }`); the server runs the authoritative `@monopoly/engine`
 * reducer and broadcasts the new `GameState` via a reactive query. This keeps
 * payloads small and makes the server the single source of truth (cheat-proof).
 *
 * Milestone 3 will replace the bodies below with `useQuery`/`useMutation`
 * against generated Convex functions, behind these exact hook signatures so
 * screens written now don't change.
 */
import type { Action, GameState } from '@monopoly/engine';

export interface OnlineGame {
  state: GameState | null;
  /** True while the initial subscription is loading. */
  loading: boolean;
}

/** Subscribe to a room's authoritative state. (Stub — wired in M3.) */
export function useOnlineGame(_roomId: string): OnlineGame {
  return { state: null, loading: true };
}

/** Dispatch an intent to the server, which validates + broadcasts. (Stub — M3.) */
export type DispatchOnline = (action: Action) => Promise<void>;
export function useOnlineDispatch(_roomId: string): DispatchOnline {
  return async () => {
    throw new Error('Online play is not enabled yet (Milestone 3).');
  };
}
