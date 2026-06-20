/**
 * Convex Auth JWT provider config (Milestone 4).
 *
 * Convex Auth issues its own JWTs and serves the JWKS from this deployment's
 * site URL (`convex/http.ts` registers the routes), so the issuer `domain` is
 * our own `CONVEX_SITE_URL`. Without this file `ctx.auth.getUserIdentity()`
 * always returns null.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
};
