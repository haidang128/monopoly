# Deploying the web app

The web app ships as a static Expo Router export hosted on **EAS Hosting**, talking
to a **production Convex** backend. There are two independent pieces to ship:

1. The Convex backend (functions + env vars)
2. The web frontend (static bundle on EAS Hosting)

## Deployments at a glance

| Environment | Convex deployment | Convex URL | Web URL |
|-------------|-------------------|------------|---------|
| Dev (local) | `dev:grand-rooster-185` | `https://grand-rooster-185.eu-west-1.convex.cloud` | `localhost:8081` |
| Production  | `accomplished-bass-631` | `https://accomplished-bass-631.convex.cloud` | https://monopoly.expo.app |

- Convex prod dashboard: https://dashboard.convex.dev/t/dangngochai/monopoly/accomplished-bass-631
- EAS Hosting dashboard: https://expo.dev/projects/d3969197-3a8c-4232-bbd4-becf8b2bec84/hosting/deployments

---

## Full deploy (backend + frontend)

### 1. Deploy the Convex backend (only if `convex/` changed)

```bash
npx convex deploy --yes
```

This pushes functions/schema to the production deployment (`accomplished-bass-631`).

### 2. Build the web bundle pointing at PROD Convex

The Convex URL is **inlined into the bundle at build time** from
`EXPO_PUBLIC_CONVEX_URL`. Local `.env.local` points at *dev*, so for a prod build you
must temporarily point it at prod **and** clear Metro's cache.

> ⚠️ **Two gotchas, both real:**
> - `.env.local` overrides inline `VAR=... npx expo export`, so setting the var on the
>   command line does **not** work — you must edit `.env.local`.
> - Metro caches the inlined env value. If you change the env without `--clear`, you get
>   a **byte-identical stale bundle** (same filename hash). Always pass `--clear`.

```bash
# Back up, swap to prod URLs, build, restore
cp .env.local .env.local.bak

# Edit .env.local so these two lines read:
#   EXPO_PUBLIC_CONVEX_URL=https://accomplished-bass-631.convex.cloud
#   EXPO_PUBLIC_CONVEX_SITE_URL=https://accomplished-bass-631.convex.site
# (leave CONVEX_DEPLOYMENT=dev:grand-rooster-185 unchanged)

npx expo export --platform web --clear

# Restore dev env
mv .env.local.bak .env.local
```

Verify the right URL was baked in before deploying:

```bash
grep -rl "accomplished-bass-631" dist/_expo/static/js/web/   # should list the entry file
grep -rl "grand-rooster-185"     dist/_expo/static/js/web/   # should print NOTHING
```

### 3. Promote to production on EAS Hosting

```bash
npx eas-cli deploy --prod --non-interactive
```

Serves the `dist/` you just built at the permanent alias **https://monopoly.expo.app**.
(Omit `--prod` to publish a throwaway preview URL instead.)

### 4. Smoke-test

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://monopoly.expo.app   # expect 200
```

Then open the URL and exercise auth + an online game in a real browser.

---

## Production Convex env vars

Already set on `accomplished-bass-631` (view with `npx convex env list --prod`):

| Var | Notes |
|-----|-------|
| `APPLE_CLIENT_ID` | `com.haidang128.monopoly` |
| `JWKS` | Convex Auth public key set |
| `JWT_PRIVATE_KEY` | Convex Auth signing key |
| `SITE_URL` | `https://monopoly.expo.app` — used for auth/OAuth redirects |

Set one with: `npx convex env set --prod NAME value`
(for values starting with `-`, like a PEM key, use the `NAME=value` form so the CLI
doesn't parse it as a flag).

---

## Tech-debt / follow-ups

- **JWT keypair is currently shared between dev and prod.** Fine for beta; rotate prod to
  its own keypair before a real launch (a leaked dev key would otherwise compromise prod).
- **Apple Sign-In on web is unverified** — `expo-apple-authentication` is built for native
  iOS; the web flow differs. Test it explicitly.
