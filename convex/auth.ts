/**
 * Convex Auth setup (Milestone 4).
 *
 * Guest-first with an optional Apple upgrade:
 *   - **Anonymous** — the client signs in anonymously on launch, minting a real
 *     server-verifiable JWT (see `services/convex/client` → `AnonymousGate`).
 *   - **Apple (native)** — the iOS app uses `expo-apple-authentication`'s native
 *     button to obtain Apple's identity token, then calls `signIn('apple', {
 *     idToken })`. We verify that token here against Apple's JWKS and
 *     retrieve-or-create the matching account. Guest sign-in stays available; a
 *     player can keep playing as a guest and sign in with Apple later.
 *
 * Every game mutation derives the caller from `ctx.auth.getUserIdentity()` (via
 * `getAuthUserId`), so a tampered client can never act as another seat.
 */
import { Anonymous } from '@convex-dev/auth/providers/Anonymous';
import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import { convexAuth, createAccount, retrieveAccount } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const APPLE_ISSUER = 'https://appleid.apple.com';
/** Apple's public keys; `jose` caches and refreshes these for us. */
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/**
 * Verify a native Sign-in-with-Apple identity token and return the stable Apple
 * user id (`sub`). The `aud` claim must equal our iOS bundle id (set as
 * `APPLE_CLIENT_ID` on the deployment); the `iss` must be Apple.
 */
async function verifyAppleIdToken(idToken: string): Promise<string> {
  const audience = process.env.APPLE_CLIENT_ID;
  if (!audience) throw new ConvexError('Sign in with Apple is not configured (APPLE_CLIENT_ID)');
  let sub: unknown;
  try {
    const { payload } = await jwtVerify(idToken, appleJwks, { issuer: APPLE_ISSUER, audience });
    sub = payload.sub;
  } catch {
    throw new ConvexError('Invalid Apple identity token');
  }
  if (typeof sub !== 'string' || !sub) throw new ConvexError('Apple token missing subject');
  return sub;
}

/**
 * Native Apple sign-in. The client passes the identity token (and, on first
 * sign-in only, the display name) from the native dialog. Existing Apple users
 * sign back into their account; first-timers get a fresh account.
 */
const Apple = ConvexCredentials({
  id: 'apple',
  authorize: async (credentials, ctx) => {
    const idToken = credentials.idToken;
    if (typeof idToken !== 'string') throw new ConvexError('Missing Apple identity token');
    const appleUserId = await verifyAppleIdToken(idToken);

    // Returning Apple user → sign into the existing account.
    try {
      const found = await retrieveAccount(ctx, { provider: 'apple', account: { id: appleUserId } });
      return { userId: found.user._id };
    } catch {
      // No account yet — fall through and create one.
    }

    const name =
      typeof credentials.name === 'string' && credentials.name.trim() ? credentials.name.trim() : undefined;
    const { user } = await createAccount(ctx, {
      provider: 'apple',
      account: { id: appleUserId },
      profile: name ? { name } : {},
    });
    return { userId: user._id };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous, Apple],
});
