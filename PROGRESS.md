# Cờ Tỷ Phú Việt — Build Progress

> Living status doc for the Monopoly-style app. Approved plan lives at
> `C:\Users\Hai\.claude\plans\act-as-a-senior-curious-metcalfe.md`.
> Update this file at the end of each working session.

**Last updated:** 2026-06-18 (M2: board grid, dice/token/event-card animations,
haptics, and the full setup screen all landed)

## Locked product decisions

- **Design direction:** "Cờ Tỷ Phú Việt" — bilingual Vietnamese/English, hi-fi
  red/cream/gold theme (`Mobile monopoly design/Dai Gia Hifi.dc.html`).
- **Scope:** both **pass-and-play** and **online realtime** in v1.
- **Monetization:** launch free; cosmetic packs + remove-ads later (no pay-to-win).
- **Platforms:** iOS first, then Android, web last.
- **Architectural keystone:** one pure deterministic engine; pass-and-play runs it
  on-device, online runs the *same* engine inside authoritative Convex mutations.
- **Stack:** Expo SDK 56 / RN 0.85 / Expo Router (existing scaffold) · Zustand ·
  i18next (VI/EN) · Reanimated · **Convex** for realtime · guest + Sign in with Apple.
- **IP guardrail:** all names/cities/cards/tiles are original. No "Monopoly" branding,
  no Hasbro property names or exact classic tile identities.

## Milestones

1. ✅ **Engine + data** — pure TS rules, board/card content, tests. **DONE.**
2. 🟡 **Pass-and-play** — **scaffolding + architecture conventions DONE** (engine
   wired, service seams, store, i18n, navigation skeleton, runnable vertical slice).
   Remaining: hi-fi board grid, dice/card animations, full setup/portfolio/trade
   screens, haptics+sound, MMKV persistence, expo-localization detection.
3. ⬜ **Online** — Convex schema/mutations wrapping the engine, lobby/rooms, sync,
   reconnect, turn timer.
4. ⬜ **Auth + polish** — guest + Apple, house-rule presets, recap/share, haptics/sound.
5. ⬜ **Beta** — EAS + TestFlight, Sentry + analytics, bugfix, then Android.

## Milestone 1 — COMPLETE ✅

Location: `packages/engine/` (standalone package, own `package.json` + Vitest).

Framework-agnostic, deterministic rules engine. No React/Expo/Convex imports.

| File | Purpose |
|---|---|
| `src/types.ts` | `GameState`, `Player`, `Tile`, `Action`, cards, trades |
| `src/rng.ts` | Seeded mulberry32 PRNG; state lives in `GameState.rngState` |
| `src/board.ts` | Original 40-tile VN board (8 tiers, 4 stations, 2 utilities) |
| `src/cards.ts` | Cơ Hội / Khí Vận decks (bilingual, plain-data effects) |
| `src/helpers.ts` | Rent math, ownership, net worth, build/sell legality, `labelOf` |
| `src/reducer.ts` | `createGame` + `reduce` — single source of truth |
| `src/index.ts` | Public barrel export |
| `tests/*.test.ts` | 37 tests incl. a self-playing 4-player bot to completion |

**Status:** 37/37 tests pass (`npx vitest run`), typecheck clean
(`npx tsc --noEmit`, strict). Bounded log (`MAX_LOG_ENTRIES`) fixed an O(n²)
clone hotspot (suite 481s → 34s).

`GameState.phase` drives the UI:
`preRoll | awaitBuy | auction | mustResolveDebt | jailOptions | turnEnd | gameOver`.

### Known v1 simplifications (documented in `packages/engine/README.md`)
- House/hotel bank supply limits not enforced.
- Unaffordable `payEach` card deferred to bank as a lump sum.
- Mortgage checks the individual tile, not the whole color group.

## Milestone 2 — IN PROGRESS 🟡 (scaffolding + conventions done)

Architecture conventions (from the senior-architecture review) are now baked in.
**Follow these for all new app code:**

- **Folder structure — feature-first, not type-first.**
  - `src/app/` — Expo Router routes ONLY (thin screens; read store + dispatch).
  - `src/features/<feature>/` — co-located UI+hooks+store (e.g. `features/game/store/`).
  - `src/shared/{ui,lib}/` — cross-feature primitives (`Button`, `Brand`, `formatDong`).
  - `src/services/{config,storage,analytics,convex,auth}/` — swappable infra seams.
  - `src/i18n/` — i18next VI/EN.
- **Engine wiring:** import `@monopoly/engine` (tsconfig path alias +
  `metro.config.js` resolver alias → `packages/engine/src`). One rule set, two runtimes.
- **State — three tiers, never mixed:** (1) authoritative game state = engine, held in
  `features/game/store/pass-and-play.ts` (local) or Convex (online); (2) ephemeral UI
  state = separate Zustand store; (3) server cache = Convex reactive client, never mirrored.
  Subscribe via selector hooks (`useGameState`, `useCurrentPlayer`, …).
- **API = actions, not state.** Dispatch intents (`{type:'ROLL'}`); the authoritative
  side runs the engine and broadcasts. Online seam stub: `services/convex`.
- **Auth:** guest-first, seat ≠ account, upgrade-not-replace. Seam: `services/auth`.
- **Local storage:** everything via `services/storage`; saves are **versioned**
  (`SAVE_SCHEMA_VERSION`, discard/migrate on mismatch). Default in-memory backend;
  swap MMKV in the native build via `setStorageBackend`.
- **Env config:** `app.config.ts` layers `extra` from `EXPO_PUBLIC_*` over `app.json`;
  read only through `services/config` (`assertConfig` fails fast in prod).
- **Error handling:** route-level `ErrorBoundary` in `app/_layout.tsx`; treat
  "server rejected my action" as recoverable (re-sync), not a crash.
- **Analytics:** typed-event facade `services/analytics` (`track(...)`), no-op until a
  vendor is set; emit from the store/dispatch layer, not views.

**What's runnable now:** Home → Setup → `game/[roomId]` vertical slice drives the real
engine (roll/buy/pass/end-turn/jail/debt/auction) → game-over screen. VI/EN toggle works.

**Files created in M2 scaffolding:**

| Path | Purpose |
|---|---|
| `metro.config.js`, `app.config.ts`, tsconfig alias | engine wiring + dynamic env |
| `src/services/config` | typed/validated runtime config from `extra` |
| `src/services/storage` | KV seam + versioned pass-and-play save (in-mem default) |
| `src/services/analytics` | typed-event facade, no-op sink |
| `src/services/convex` · `src/services/auth` | online + auth seams (stubs for M3/M4) |
| `src/i18n` + `resources/{vi,en}.ts` | i18next init + bilingual strings |
| `src/features/game/store/pass-and-play.ts` | Zustand store wrapping the engine + selectors |
| `src/shared/ui/{button,brand}` · `src/shared/lib/format` | shared primitives |
| `src/app/{_layout,index,setup}.tsx` · `src/app/game/[roomId]/{_layout,index,over}.tsx` | navigation + slice |

**Status:** app typecheck clean (`npx tsc --noEmit`), `npx expo lint` clean,
engine 37/37 still green. Deps added: `zustand`, `i18next`, `react-i18next`.

### Remaining for M2 (next session — START HERE)
**Before writing UI code:** read Expo SDK 56 docs per `AGENTS.md`.

> ▶ **NEXT UP: the portfolio screen** (a player's holdings + cash + net worth),
> as a route-presented modal/sheet off the game screen. It's the foundation the
> build-manage and trade modals reuse. Helpers ready in the engine:
> `netWorth`, `maxRaisable`, `rentFor`, `isOwnable`, `priceOf`, `mortgageOf`,
> `labelOf`, `GROUPS`, `groupPositions`. Open it from the "Tài sản · Assets"
> button already stubbed in the game-screen action area. Then: trade, build/manage,
> jail, auction modals → sound → MMKV → expo-localization.

- ✅ Hi-fi **board grid** + tokens + tap-tile inspect — DONE.
  `src/features/game/board/{geometry,tile,board}.tsx` render the live 40-tile ring
  (11×11 flex layout, group bands, owner/house markers, player tokens, center
  felt+logo); `app/game/[roomId]/index.tsx` now renders `<Board>` + tap inspector.
  Pure `geometry.ts` mirrors the design's `pos()`/`bandFor()`. tsc + lint clean.
  Next polish here: house/hotel pips are placeholders, inspector is a one-liner
  (promote to a form sheet), tokens don't yet animate between tiles.
- 🟡 **Dice/card/token animations** (Reanimated), **haptics + sound**.
  - ✅ Animated **dice** (`src/features/game/board/dice.tsx`): tumble-and-settle on
    each new roll, pip faces, fires only on a genuine in-session roll (silent on
    resume / turn-end). Wired into the game screen (replaces the dice text).
  - ✅ **Haptics seam** `src/services/haptics` (semantic verbs, native-only no-op
    on web): dice roll = heavy impact, doubles = success, buy = tap.
  - ✅ **Token movement** (`src/features/game/board/tokens.tsx`): absolute,
    `pointerEvents="none"` overlay; each piece walks the ring tile-by-tile on a
    normal move and slides straight on a jump (jail / advance-to). Board measures
    itself via `onLayout`; centers come from pure `geometry.tileCenterFraction`.
    Static per-tile token dots removed from `TileView` (overlay owns pieces now).
  - ✅ **Event-card reveal** (`src/features/game/board/event-card.tsx`): dimmed
    overlay + cream card springs in (Reanimated `ZoomIn`) on a draw — gold/"?" for
    Cơ Hội, green/"✦" for Khí Vận, tap-to-dismiss. **Engine change (additive):**
    `GameState.lastCard = { card, draw }` (monotonic counter) set in
    `applyCard`, so local + online clients reveal each draw once. Engine 37/37
    still pass. Screen watches `lastCard.draw` to show it exactly once.
  - Reanimated needs NO babel config in SDK 56 (auto via `babel-preset-expo`).
    Verified: `npx expo export --platform web` bundles all routes clean.
  - Remaining: **sound** (expo-audio).
- ✅ Full **setup** screen — DONE. `src/app/setup.tsx`: 2–6 player roster
  (editable names, tap-swatch to cycle a unique token color, add/remove seats),
  house rules = starting-cash preset segment (₫10k/15k/20k) + auction & free-parking
  toggles (RN `Switch`). Dispatches `start(players, rules)` → `game/local`. tsc +
  lint clean, web bundles. New i18n keys added (vi/en).
- **portfolio**, **trade**, **build/manage**, **jail**, **auction** UIs as modals.
- **MMKV** backend (`setStorageBackend`) + **expo-localization** device detection.
- Expand i18n resource keys to cover all new screens.

**Verification target for M2:** `npm run ios`, play a full 2-player game on one
device, save survives backgrounding/relaunch, toggle VI/EN mid-game.

## Useful commands

```bash
# engine
cd packages/engine && npx vitest run        # tests (~34s; bot sims are slow)
cd packages/engine && npx tsc --noEmit       # typecheck

# app (Milestone 2+)
npm run ios | npm run android | npm run web
npx tsc --noEmit                             # app typecheck (needs typed-routes generated)
npx expo lint                                # lint
```

> Note: Expo Router **typed routes** are generated by Metro. After adding/renaming
> routes, run `expo start` once (or a bounded `CI=1 timeout 60 npx expo start`) so
> `.expo/types/router.d.ts` regenerates before `tsc`, or new `router.push('/x')`
> paths will look like type errors.
