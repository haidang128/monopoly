# Convex backend — online play (Milestone 3)

Authoritative server for online mode. It runs the **same** `@monopoly/engine`
reducer that pass-and-play runs on-device (imported by relative path so Convex's
bundler picks up the pure-TS source), so one rule set drives both modes.

## Files

| File | Purpose |
|---|---|
| `schema.ts` | `games` table: lobby/seat metadata + the authoritative `GameState` |
| `games.ts` | `createRoom` / `joinRoom` / `startGame` / `dispatch` mutations + `getByCode` query |
| `_generated/` | Created by `convex dev` — do not edit, not committed-relevant |

`dispatch` is the keystone: it validates that the acting seat belongs to the
caller, runs `reduce(state, action)`, and persists the new state. Clients send
**actions, not state**.

## First-time setup (requires a Convex account / login)

```bash
npx convex dev          # logs in, creates a dev deployment, generates convex/_generated
```

`convex dev` prints a deployment URL. Expose it to the app:

```bash
# .env.local (read by app.config.ts → services/config.convexUrl)
EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

With the URL set, `ConvexClientProvider` (in `src/services/convex/client.tsx`)
wraps the app in a live client; without it, the app stays pass-and-play only.

## Wiring the client (after `_generated` exists)

`src/services/convex/index.ts` holds the hook contract (`useOnlineGame`,
`useOnlineDispatch`). Once `convex dev` has generated the API, wire them:

```ts
import { api } from '../../../convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
// useOnlineGame  -> useQuery(api.games.getByCode, { code })
// useOnlineDispatch -> useMutation(api.games.dispatch)
```

## Still to build for M3

- Lobby/room screens (create + join by code, seat list, host "Start").
- Identity: pass the guest id from `services/auth` as `identityId` (M4 swaps in
  `ctx.auth` for real accounts).
- Reconnect handling + the turn timer (`turnDeadline` is already in the schema).
