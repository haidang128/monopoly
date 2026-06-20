/**
 * Auth seam (Milestone 4).
 *
 * Identity model (decided up front because it's expensive to change later):
 *   - A guest session is created silently on launch via Convex Auth's Anonymous
 *     provider (see `services/convex/client` → `AnonymousGate`), which mints a
 *     real, server-verifiable JWT.
 *   - It can be UPGRADED to Sign in with Apple (native; iOS) — see
 *     `features/game/online/apple-sign-in-button`. Guest sign-in stays available.
 *   - **Seat ≠ account.** A seat in a game is its own id, so guests, reconnects
 *     and account-linking all work. Nothing is gated behind login except
 *     cross-device sync.
 *
 * `userId` is the server-authoritative auth user id (Convex Auth `users` row);
 * the server derives it from the JWT via `ctx.auth`, and the `myId` query echoes
 * it back so the client can find its own seat. The token itself lives in
 * `expo-secure-store` and is never read here — go through Convex Auth.
 */
import { useQuery } from 'convex/react';

import { getItem, setItem } from '@/services/storage';
import { api } from '../../../convex/_generated/api';

export interface Identity {
  /** Server-authoritative auth user id; null until anonymous sign-in resolves. */
  userId: string | null;
  isGuest: boolean;
  displayName: string | null;
}

const GUEST_NAME_KEY = 'auth.guestName';

/** The player's chosen display name (persisted locally), or null if unset. */
export function getDisplayName(): string | null {
  return getItem(GUEST_NAME_KEY);
}
export function setDisplayName(name: string): void {
  setItem(GUEST_NAME_KEY, name);
}

/**
 * The signed-in identity. `userId` is null while anonymous sign-in is in flight
 * (or if online isn't configured). Must be used within the Convex provider.
 */
export function useIdentity(): Identity {
  const userId = useQuery(api.games.myId);
  return { userId: userId ?? null, isGuest: true, displayName: getDisplayName() };
}
