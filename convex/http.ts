/**
 * HTTP routes. Convex Auth registers its sign-in / token / JWKS endpoints here
 * (`/.well-known/...` etc.) so the deployment can verify its own JWTs.
 */
import { httpRouter } from 'convex/server';

import { auth } from './auth';

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
