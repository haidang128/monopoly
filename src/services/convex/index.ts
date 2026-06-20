/**
 * Online backend seam (Convex).
 *
 * Contract: send **actions, not state**. The client dispatches intents
 * (`{ type: 'ROLL' }`); the server (`convex/games.ts`) runs the authoritative
 * `@monopoly/engine` reducer and broadcasts the new `GameState` through the
 * reactive `getByCode` query. The server is the single source of truth, so a
 * tampered client cannot fabricate dice or money.
 *
 * Identity is derived **server-side** from the signed-in JWT
 * (`ctx.auth.getUserIdentity()`), so mutations no longer accept a client id —
 * a tampered client can't act as another seat (Milestone 4 security fix).
 */
import { useMutation, useQuery } from 'convex/react';

import type { Action, GameState, HouseRules } from '@monopoly/engine';
import { api } from '../../../convex/_generated/api';

export interface OnlineSeat {
  playerId: string;
  name: string;
  token: string;
  identityId: string | null;
}

export interface OnlineRoom {
  code: string;
  status: 'lobby' | 'active' | 'finished';
  hostId: string;
  seats: OnlineSeat[];
  state: GameState | null;
  phase: string | null;
  turnDeadline: number | null;
}

/** Subscribe to a room. `room` is null while loading or if it doesn't exist. */
export function useRoom(code: string | null): { room: OnlineRoom | null; loading: boolean } {
  const room = useQuery(api.games.getByCode, code ? { code } : 'skip');
  return { room: (room ?? null) as OnlineRoom | null, loading: room === undefined };
}

export interface Me {
  userId: string;
  isAnonymous: boolean;
  name: string | null;
}

/** The signed-in user's profile (guest vs Apple). Null until auth resolves. */
export function useMe(): Me | null {
  return (useQuery(api.games.me) ?? null) as Me | null;
}

/** Lobby mutations. The caller's identity comes from the JWT; seat colors are server-assigned. */
export function useOnlineActions() {
  const createRoomFn = useMutation(api.games.createRoom);
  const joinRoomFn = useMutation(api.games.joinRoom);
  const startGameFn = useMutation(api.games.startGame);
  const leaveRoomFn = useMutation(api.games.leaveRoom);

  return {
    createRoom: (host: { name: string }) => createRoomFn({ host }),
    joinRoom: (code: string, player: { name: string }) => joinRoomFn({ code, player }),
    startGame: (code: string, rules?: Partial<HouseRules>) => startGameFn({ code, rules }),
    leaveRoom: (code: string) => leaveRoomFn({ code }),
  };
}

/** Dispatch an engine action to the server for a room (the server validates the seat). */
export function useOnlineDispatch(code: string): (action: Action) => Promise<unknown> {
  const dispatchFn = useMutation(api.games.dispatch);
  return (action: Action) => dispatchFn({ code, action });
}
