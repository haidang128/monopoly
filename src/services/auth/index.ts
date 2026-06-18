/**
 * Auth seam — placeholder until Milestone 4.
 *
 * Identity model (decided up front because it's expensive to change later):
 *   - A guest session is created silently on first launch (device-scoped id).
 *   - It can be UPGRADED to Sign in with Apple WITHOUT losing the guest's games
 *     (link, never replace).
 *   - **Seat ≠ account.** A player's seat in a game is its own id, so guests,
 *     reconnects and account-linking all work. Nothing is gated behind login
 *     except cross-device sync.
 *
 * The token, once real, lives in `expo-secure-store` — never read it in
 * components; go through this module.
 */

export interface Identity {
  /** Stable device/guest id. */
  userId: string;
  isGuest: boolean;
  displayName: string | null;
}

/** Get-or-create the local guest identity. (Stub — persisted id arrives in M4.) */
export function useIdentity(): Identity {
  return { userId: 'guest-local', isGuest: true, displayName: null };
}

/** Upgrade the current guest to a real account, preserving their data. (M4.) */
export async function linkAppleAccount(): Promise<void> {
  throw new Error('Sign in with Apple is not enabled yet (Milestone 4).');
}
