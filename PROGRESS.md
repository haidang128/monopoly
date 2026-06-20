# Cờ Tỷ Phú Việt — Build Progress

> Living status doc for the Monopoly-style app. Approved plan lives at
> `C:\Users\Hai\.claude\plans\act-as-a-senior-curious-metcalfe.md`.
> Update this file at the end of each working session.

**Last updated:** 2026-06-20 (M4 in progress: **ctx.auth security fix** +
**Sign in with Apple (native)** both code-complete. Convex Auth now runs
Anonymous (guest) + a custom Apple Credentials provider that verifies the native
identity token server-side; client has an iOS-only Apple upgrade button.
CLI-verified: spoof/unauth calls rejected, bogus Apple token rejected. NEEDS the
user's Apple Developer setup + on-device QA for the Apple happy-path (see the
⚠️ USER SETUP box in the M4 section). House-rule presets done (shared picker in
setup + online lobby) and recap/share screen done (shared `RecapView` in
pass-and-play + online, with native Share). **M4 code-complete.** **M5 scaffolding
done:** `eas.json` build profiles, Sentry observability seam (inert until DSN),
analytics dev sink + vendor-ready facade, ios/android identifiers — all verified
(tsc + lint clean, web export 12 routes, `expo config` resolves every native
plugin). What's left for M5 is user-side only (needs an Apple Developer account +
EAS/device): run EAS builds → TestFlight, set `EXPO_PUBLIC_*` secrets + Sentry
DSN, pick an analytics vendor, on-device bugfix + Android. Also still open: M2 real
SFX assets + on-device QA, Apple on-device QA.)

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
2. 🟢 **Pass-and-play** — **feature-complete** (hi-fi board+cards, animations,
   haptics, setup/portfolio/trade/build/jail/auction UIs, sound seam, MMKV
   persistence, expo-localization, app-wide design fonts). Remaining before ✅:
   real sound assets + a full on-device play-through (see NEXT UP).
3. ✅ **Online** — realtime play + asset sheets + turn timer + reconnect/
   connection-state + lobby niceties (leave-room, server-assigned colors, resume
   entry) all WORKING (Convex live; verified against the deployment). The M4
   auth/security fix below closed the last open item.
4. 🟢 **Auth + polish** — **CODE-COMPLETE.** ctx.auth security fix, Sign in with
   Apple (native; needs the user's Apple Developer setup + on-device QA),
   house-rule presets, and recap/share all done. (Convex Auth: Anonymous guest +
   custom Apple Credentials provider; identity server-verified.)
5. 🟢 **Beta** — **scaffolding in place** (EAS profiles, Sentry seam, analytics
   sink, Android id). Remaining needs an Apple Developer account + EAS/device:
   actual EAS builds → TestFlight, set DSN/analytics secrets, bugfix, then Android.

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

> ▶ **NEXT UP: Milestone 5 (beta) — finish the user-side steps.** M5 **code
> scaffolding is done** (2026-06-20: `eas.json` profiles, Sentry seam, analytics
> sink, Android id — see the M5 section). What's left needs an Apple Developer
> account + EAS/device and so can't be done in this environment: run the EAS
> builds → TestFlight, set the `EXPO_PUBLIC_*` build secrets + create the Sentry
> project for a DSN, pick/wire an analytics vendor, then an on-device bugfix pass
> and Android. See the ⚠️ USER STEPS box in the M5 section.
>
> Still open from M2 (not blocking, user-side): real **SFX assets** in
> `assets/sounds/`, and an on-device play-through (`npm run ios`) to confirm
> fonts + MMKV persistence across relaunch.
>
> (Resolved 2026-06-19: the `mustResolveDebt` block is now a proper
> `features/game/debt/debt-panel.tsx` — localized title/reason, player + creditor
> by name ("Bank" for the bank), an Assets shortcut to raise cash, Pay disabled
> until affordable, and Declare-bankruptcy. i18n keys added; tsc + lint clean.)

- ✅ Hi-fi **board grid** + tokens + tap-tile inspect — DONE, then given the full
  **"Board & Cards" hi-fi visual overhaul** (`Mobile monopoly design/Board and
  Cards.dc.html`):
  - `board.tsx`: dark `#1E1913` wood frame, `#C9BDA4` grid-line gaps, and a rich
    center — faint Vietnam-map panel, two dashed event-deck markers (gold "?"
    Cơ Hội / teal "◆" Khí Vận) and the rotated red logo. Takes a `locale` prop.
  - `tile.tsx`: thick group-color band on the inner edge, full city name + price,
    content rotated to face inward per side (`contentRotation` in `geometry.ts`),
    a vector glyph per special tile, and house/hotel pips riding the band.
  - `board-icons.tsx` (new): tiny View-built glyphs (GO arrow, jail bars, parking
    P, handcuffs, train, power bolt, water drop, tax coin, luxury gem) — no SVG dep.
  - `tile-deed.tsx` (new): the tap inspector is now a proper **title-deed card** —
    group-colored header, full rent ladder (base / full-set ×2 / 1–4 houses /
    hotel), per-house + mortgage boxes, dark price bar; stations & utilities get
    reduced schedules. Tapping a tile toggles it.
  - `event-card.tsx`: added the dashed illo box + a category tag pill (Move /
    Collect / Penalty / To-jail, derived from the card's effect).
  - Many i18n keys added (vi/en). tsc + lint clean; `expo export --platform web`
    bundles all routes.
- ✅ **Design fonts** — DONE. The three typefaces (Playfair Display / Be Vietnam
  Pro / IBM Plex Mono) load via `@expo-google-fonts/*` + `useFonts` in
  `app/_layout.tsx`, gated behind the splash screen (`expo-splash-screen`).
  `src/shared/ui/fonts.ts` exposes `fontMap` (for `useFonts`) and a semantic
  `Fonts` role map (display/body/mono variants). Applied **app-wide**: board,
  tiles, title-deed, event card, home, setup, game screen, game-over, portfolio,
  trade, jail + auction panels, shared `Button`, and the root error boundary.
  Playfair for display/headings, Be Vietnam Pro for UI/body, IBM Plex Mono for
  uppercase eyebrow labels. **Note:** custom `fontFamily` encodes the weight on
  native (the `fontWeight` prop is ignored there), so each role maps to a specific
  loaded family. (Leftover Expo scaffold under `src/components/*` is unused and
  was left on system fonts.)
- ✅ **Player token = name initial** — DONE. `board/tokens.tsx` renders each
  player's first-letter initial inside the (now 18px) animated token, with
  ink/paper text chosen by perceived luminance for contrast on any fill. The
  cash-strip chips + setup swatches still use plain color dots (could match).
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
  - ✅ **sound** (expo-audio) — `src/services/sound` seam mirrors `haptics`:
    semantic verbs (`roll/buy/card/trade/win`), `mixWithOthers` audio mode, lazy
    per-sound `createAudioPlayer`, all wrapped so a missing file can't break a
    turn. Cues fire from the store's `emitDerivedEvents` (one trigger point for
    local + future online). **No-op until** `ASSETS` in `services/sound/index.ts`
    points at real files in `assets/sounds/`.
- ✅ Full **setup** screen — DONE. `src/app/setup.tsx`: 2–6 player roster
  (editable names, tap-swatch to cycle a unique token color, add/remove seats),
  house rules = starting-cash preset segment (₫10k/15k/20k) + auction & free-parking
  toggles (RN `Switch`). Dispatches `start(players, rules)` → `game/local`. tsc +
  lint clean, web bundles. New i18n keys added (vi/en).
- ✅ **portfolio** sheet — DONE. `src/features/game/portfolio/portfolio-sheet.tsx`
  is a pure read-only feature component (cash / net worth / max-raisable summary,
  a player switcher to inspect any seat, holdings grouped by color set → stations
  → utilities with band color, rent, mortgage value, house pips / hotel marker,
  monopoly + mortgaged badges). Route `app/game/[roomId]/portfolio.tsx` presents
  it as a `presentation: 'formSheet'` (detents 0.6/0.95, grabber) registered in
  the game `_layout.tsx`; opened from the now-wired "Assets" button in the
  game-screen action bar via `router.push('./portfolio')`. New i18n keys (vi/en).
  tsc + lint clean, typed routes regenerated. Trade/build reuse this component.
- ✅ **trade** modal — DONE. `src/features/game/trade/trade-sheet.tsx` is a
  two-stage flow: **compose** (current player — the only one who may
  `PROPOSE_TRADE` — picks a partner, toggles give/receive tiles and sets cash per
  side, client-validated to mirror `validateTrade`: house-free tiles only,
  mortgaged allowed, cash clamped to each player's balance) → **review** (once
  `state.pendingTrade` is set the same sheet flips to the recipient's
  perspective: "pass the device to {name}", Accept/Decline → `RESPOND_TRADE`).
  Reuses the portfolio band/badge visual language. Route
  `app/game/[roomId]/trade.tsx` presents it as a `formSheet` (0.95 detent),
  registered in the game `_layout.tsx`; opened from a "Trade / Review offer"
  button in the action bar (shown in preRoll/turnEnd or whenever a pendingTrade
  exists, and only with 2+ active players). New i18n keys (vi/en). tsc + lint
  clean, typed routes regenerated.
- ✅ **build/manage** — DONE, folded into the portfolio sheet (single holdings
  list, no duplicate). `PortfolioSheet` now takes an optional `dispatch`; when
  present and the viewed seat is the current player in an asset-legal phase, each
  holding row shows compact gold chips: **Build ₫cost** / **Sell +₫½cost** /
  **Mortgage +₫m** / **Unmortgage ₫⌈1.1m⌉**. Each chip is shown only when
  relevant (build/sell on properties; sell only with houses; lift only when
  mortgaged) and disabled unless the engine would accept it now — `canBuild` /
  `canSellHouse` for the even-build rule, plus phase gates mirroring the reducer
  (build/unmortgage → preRoll/turnEnd; sell/mortgage → also
  mustResolveDebt/jailOptions). The portfolio route passes the store dispatch.
  New i18n keys (vi/en). tsc + lint clean.
- ✅ **jail + auction** panels — DONE. Phase-driven in-screen panels (not
  on-demand routes) that replace the old single-button action blocks.
  `features/game/jail/jail-panel.tsx` (`jailOptions`): roll for doubles
  (`JAIL_ROLL`), pay fine (`JAIL_PAY`, disabled when unaffordable), use card
  (`JAIL_CARD`, shown only when `getOutCards > 0`), with an attempt counter.
  `features/game/auction/auction-panel.tsx` (`auction`): tile label, standing
  high bid + bidder (or "no bids"), whose turn, a ±₫100 bid stepper clamped to
  `[highBid+1, cash]`, Bid (`AUCTION_BID`, disabled unless it beats the bid and
  is affordable) + Pass (`AUCTION_PASS`). Parent remounts it per turn/bid via
  `key` so the suggested raise resets. New i18n keys (vi/en). tsc + lint clean.
- ✅ **MMKV** persistence — `react-native-mmkv` v4 (`createMMKV`) behind the
  storage seam via a platform split: `native-backend.native.ts` (MMKV) vs
  `native-backend.ts` (web/Expo-Go fallback → keeps in-memory), so the web bundle
  never imports the Nitro module. `initPersistentStorage()` runs from the
  `services/storage/init` side-effect, imported **first** in `app/_layout.tsx`
  (before `@/i18n`) so saved prefs/saves resolve against MMKV. Falls back to
  memory in Expo Go (no native module) without crashing.
- ✅ **expo-localization** device detection — `i18n` now resolves language as
  saved-pref → device locale (`getLocales()[0].languageCode`, if vi/en) →
  default vi.
- ✅ i18n resource keys expanded to cover every screen (board/deeds/cards,
  trade, portfolio, jail, auction, deeds) in vi + en.

**Verification target for M2:** `npm run ios`, play a full 2-player game on one
device, save survives backgrounding/relaunch, toggle VI/EN mid-game.

## Milestone 3 — IN PROGRESS 🟡 (backend scaffolded)

The architectural keystone is live: online runs the **same** `@monopoly/engine`
reducer as pass-and-play, inside authoritative Convex mutations. Clients send
**actions, not state**.

**Files created (`convex/` — excluded from the app `tsc` until codegen):**

| Path | Purpose |
|---|---|
| `convex/schema.ts` | `games` table: code, status, host, seats, `state` (GameState), `phase` mirror, `turnDeadline` |
| `convex/games.ts` | `createRoom` / `joinRoom` / `startGame` / `dispatch` mutations + `getByCode` query; imports the engine by **relative path** so Convex bundles the pure-TS source |
| `convex/tsconfig.json`, `convex/README.md` | Convex tsconfig + setup/wiring guide |
| `src/services/convex/client.tsx` | `ConvexClientProvider` (reads `config.convexUrl`; passthrough when unset) — mounted in `app/_layout.tsx` |

`dispatch` validates the acting seat belongs to the caller (`identityId`), runs
`reduce`, and persists — illegal actions surface as `ConvexError`.

**Done & verified (2026-06-19):** `convex dev` is set up (deployment live,
`_generated` present, `EXPO_PUBLIC_CONVEX_URL` in `.env.local`). Seam hooks wired
(`useRoom` / `useOnlineActions` / `useOnlineDispatch` in `services/convex`).
Per-device guest identity persisted in `services/auth` (`getGuestId`). Online
flow built: `app/online/index.tsx` (name + create/join-by-code) →
`app/online/[code].tsx` (lobby with seats + host Start → flips to live game).
`features/game/online/online-game.tsx` reuses Board/Dice/event-card/jail/debt/
auction panels, reads authoritative state from `useRoom`, dispatches via Convex,
and only lets you act on the seat you own (server-enforced). Home "Play online"
button → `/online`. **CLI smoke test passed**: create→join→start→ROLL ran the
engine server-side (phase advanced to awaitBuy); a wrong-identity ROLL was
rejected ("Not your seat"). App tsc + lint clean, web bundles all 10 routes.

**Online asset sheets — DONE & verified (2026-06-19):** `online/[code]` is now a
directory (`index` = lobby/game, `_layout` registers the sheets). `portfolio.tsx`
reuses `PortfolioSheet` fed `useRoom` state + `useOnlineDispatch` (build/manage
chips enabled only on your turn; server enforces it too). `trade.tsx` reuses
`TradeSheet` (propose → the recipient's device sees the review stage). The
`online-game` action bar has Assets (always) + Trade/Review (your turn or a
pending trade addressed to you). CLI-verified that the engine's own validation
flows through `dispatch` (wrong-phase `PROPOSE_TRADE` → `ConvexError: Illegal …
wrong phase`). App tsc + lint clean, web bundles all 12 routes.

**Turn timer — DONE & verified (2026-06-19):** `convex/games.ts` arms a 60s timer
on `startGame` and re-arms on every `dispatch` via `commitState` — it cancels the
old `expireTurn` job (`ctx.scheduler.cancel`) and schedules a fresh one
(`ctx.scheduler.runAt(deadline, internal.games.expireTurn, …)`), storing
`turnDeadline` + `timerJobId` on the game. `expireTurn` (internalMutation)
auto-resolves the stalled turn **one step** via `defaultActionFor(state)` (preRoll→
ROLL, awaitBuy→DECLINE_BUY, turnEnd→END_TURN, jail→JAIL_ROLL, auction→AUCTION_PASS,
debt→DECLARE_BANKRUPTCY) then re-arms; a stale firing no-ops via the `deadline`
guard. Client shows a live `⏱ Ns` countdown (`TurnTimer` in `online-game`, red in
the last 10s) from `room.turnDeadline`. convex tsc + app tsc + lint clean; pushed
via `convex codegen`.

**Reconnect / connection-state — DONE (2026-06-19):**
`features/game/online/connection-banner.tsx` uses Convex's built-in
`useConvexConnectionState()` to show a top banner ("Connecting…" first time,
"Reconnecting…" after a drop), mounted in `online/_layout.tsx` (guarded by
`getConvexClient()` so the hook only runs when a client exists). `online-game`
also gates turn actions while the socket is down (shows "Reconnecting…" instead
of buttons) so a tap isn't silently queued past the turn timer. Convex
auto-reconnects + re-runs the `getByCode` subscription, so state self-heals;
reopening `/online/[code]` re-subscribes (guest id persisted). tsc + lint clean,
web bundles.

**Lobby niceties — DONE & verified (2026-06-20):**
- **Server-assigned unique seat colors** — `convex/games.ts` now owns the token
  palette (`SEAT_COLORS`) and assigns the first unused color on create/join
  (`assignColor`); the client no longer passes a `token` (dropped from
  `createRoom`/`joinRoom` args + `useOnlineActions`). Old `TOKENS`/`randomToken`
  removed from `app/online/index.tsx`.
- **Leave-room (non-host)** — new `leaveRoom` mutation (lobby-only; host is told
  to disband instead) drops the seat and **recompacts** the remaining `playerId`s
  to stay sequential (`p1..pn`) so the next join can't collide. `joinRoom` also
  made idempotent (re-join with the same identity returns the existing seat).
  Lobby UI: non-host gets a "Leave room" button (host keeps Start + Back).
- **Resume entry on Home** — `setLastRoom`/`getLastRoom`/`clearLastRoom` in
  `services/storage`; create/join records the code, leave/disband/finish/not-found
  clears it. `features/game/online/resume-card.tsx` (`ResumeOnlineCard`) renders a
  "Rejoin room {code}" button on Home, but only when a Convex client is configured
  (`getConvexClient()` guard) **and** the saved room still exists and the player
  still holds a seat — else it self-cleans the pointer.
- New i18n keys `leaveRoom` / `resumeRoom` (vi/en). app tsc + convex tsc + lint
  clean; functions deployed via `convex dev --once`. **CLI-verified**: colors come
  out distinct (Host #B23A2C / #1565A8 / #C49A48), Bob leaving recompacts to p1
  Host + p2 Cam with colors intact, and a host `leaveRoom` → `ConvexError: The
  host must disband the room`.

### Remaining for M3
- None. The identity-spoofing hole (client used to pass its own `identityId`) is
  closed by the M4 `ctx.auth` security fix below.

> **To play-test now:** `npm run convex` (keep running) + `npm run web` in another
> terminal. Open the app in two browser tabs (each is its own anonymous guest
> identity) — tab 1 "Create room", tab 2 "Join" with the code — and watch turns
> sync live.

## Milestone 4 — IN PROGRESS 🟢 (auth + polish)

**ctx.auth security fix — DONE & verified (2026-06-20).** Identity is now derived
**server-side** from a real JWT; clients can no longer assert who they are.

- **Stack:** Convex Auth (`@convex-dev/auth` + `@auth/core@0.41.1`) with the
  **Anonymous** provider; tokens persist in `expo-secure-store` on native,
  `localStorage` on web.
- **Server (`convex/`):** new `auth.ts` (`convexAuth({ providers: [Anonymous] })`
  → `auth/signIn/signOut/store/isAuthenticated`), `auth.config.ts` (issuer =
  `process.env.CONVEX_SITE_URL`, applicationID `convex`), `http.ts`
  (`auth.addHttpRoutes`), and `...authTables` spread into `schema.ts`. Deployment
  env vars set: `JWT_PRIVATE_KEY`, `JWKS` (matched RS256 keypair), `SITE_URL`.
  `convex/tsconfig.json` got `"types": ["node"]` so `process` resolves.
- **`convex/games.ts`:** every mutation (`createRoom`/`joinRoom`/`startGame`/
  `dispatch`/`leaveRoom`/`disbandRoom`) dropped its `identityId` arg and now calls
  `requireUserId(ctx)` → `getAuthUserId(ctx)` (throws `ConvexError('Not signed
  in')` if unauthenticated). Seat ownership / host checks compare against that
  server id. New `myId` query echoes the caller's auth user id so the client can
  find its own seat.
- **Client:** `services/convex/client.tsx` swapped `ConvexProvider` →
  `ConvexAuthProvider` (secure storage on native; `storageNamespace` =
  convexUrl), with an `AnonymousGate` that calls `signIn('anonymous')` on launch.
  `services/convex/index.ts` mutations no longer send any id. `services/auth`
  `useIdentity()` now reads `api.games.myId` (userId is `string | null`);
  `getGuestId`/local-guest-id removed. `app.json` adds the `expo-secure-store`
  plugin.
- **Verified:** app tsc + convex tsc + lint clean; `expo export --platform web`
  bundles all 12 routes. CLI (no auth context): `games:myId` → null,
  `games:createRoom` → `ConvexError: Not signed in`, and passing `identityId` →
  `ArgumentValidationError: extra field identityId` — i.e. **both spoof vectors
  are gone**. OpenID/JWKS discovery endpoints serve at `${CONVEX_SITE_URL}/.well-
  known/*` with the public key matching the set private key.
- **Note (NEEDS QA):** the authenticated happy-path (anonymous sign-in →
  create/join/play) can't be exercised from the CLI; confirm it on web (two tabs)
  / on device. Anonymous sign-in creates a **new** user per fresh sign-in, so old
  pre-auth test rooms keyed by the old `guest-*` ids are stale (disband/ignore).

**Sign in with Apple (native) — CODE DONE, NEEDS DEVICE QA + Apple setup
(2026-06-20).** Guest-first: Apple is an *optional upgrade* shown next to guest
play (the anonymous flow is untouched).

- **Approach:** native `expo-apple-authentication` button → Apple identity token →
  `signIn('apple', { idToken })`. Token is verified **server-side** (no OAuth
  redirect / Services ID / client secret needed — native uses the app bundle id).
- **Server (`convex/auth.ts`):** added a custom `ConvexCredentials({ id: 'apple' })`
  provider alongside `Anonymous`. Its `authorize` verifies the token with `jose`
  (`jwtVerify` against `https://appleid.apple.com/auth/keys`, `iss` = Apple,
  `aud` = `process.env.APPLE_CLIENT_ID`), then `retrieveAccount` (returning user)
  or `createAccount` (first-timer, stores Apple name in the `users` row). New
  `me` query returns `{ userId, isAnonymous, name }`.
- **Client:** `features/game/online/apple-sign-in-button.tsx` (iOS-only via
  `Platform.OS` + `AppleAuthentication.isAvailableAsync`; hides once the user is
  no longer anonymous via `useMe`). Shown on the online entry screen. `useMe`
  added to `services/convex`. i18n keys `appleUpgradeHint` / `appleSignInFailed`.
- **Config:** `app.json` adds the `expo-apple-authentication` plugin,
  `ios.bundleIdentifier` = `com.haidang128.monopoly`, `ios.usesAppleSignIn: true`.
  Deployment env `APPLE_CLIENT_ID` set to that same bundle id.
- **Verified here:** app tsc + convex tsc + lint clean; web export bundles all 12
  routes (Apple import is web-safe, button renders only on iOS). CLI:
  `auth:signIn` with a bogus apple `idToken` → `ConvexError: Invalid Apple
  identity token` (verifier is wired). A **valid** token can only be produced on a
  real iOS device, so the happy-path is the user's QA step.

> ⚠️ **USER SETUP REQUIRED before Apple sign-in works on device** (I can't do
> these — they need an Apple Developer account):
> 1. In the Apple Developer portal, create/confirm an **App ID** with the **Sign
>    In with Apple** capability, matching `ios.bundleIdentifier` in `app.json`
>    (currently `com.haidang128.monopoly` — change it everywhere if you use a
>    different id, and update the `APPLE_CLIENT_ID` Convex env to match:
>    `npx convex env set APPLE_CLIENT_ID <your.bundle.id>`).
> 2. Build a **dev client** (`npx expo run:ios` or EAS) — Apple sign-in does NOT
>    work in Expo Go or on web.
> 3. Sign in on device and confirm `me.isAnonymous` flips to false and the button
>    hides.

**House-rule presets — DONE & verified (2026-06-20).** Named rule bundles so
players pick a play style without fiddling with every toggle, shared by
pass-and-play setup AND the online lobby (one definition, both modes).

- **Shared module `features/game/rules/presets.ts`:** `RULE_PRESETS` =
  **Classic** (engine `DEFAULT_RULES`), **Quick** (cash-rich: 20k cash / 3k GO /
  free-parking jackpot on), **Marathon** (lean: 10k cash / 1k jail fine).
  `matchPreset(rules)` derives the selected chip from the value (returns
  `'custom'` when nothing matches), so there's no separate selection state.
- **`features/game/rules/rules-picker.tsx`:** fully-controlled `RulesPicker`
  (`value`/`onChange`) — a row of preset chips + a description line over the
  detailed controls (starting-cash segment, GO-salary & jail-fine ±steppers,
  auction & free-parking switches). Picking a chip overwrites all rules; editing
  any control naturally falls to the (non-pressable) "Custom" chip.
- **Wiring:** `app/setup.tsx` replaced its inline rules card with `<RulesPicker>`
  over a single `HouseRules` state (now also exposes GO salary + jail fine, which
  it didn't before). `app/online/[code]/index.tsx` shows the picker to the **host**
  in the lobby and passes the chosen rules to `startGame(code, rules)`.
- New i18n keys (`goSalary`, `jailFine`, `preset*`/`preset*Desc`). app tsc + lint
  clean; web export bundles all 12 routes.

**Recap / share — DONE & verified (2026-06-20).** A shared game-over recap used
by both modes.

- **`features/game/recap/recap-view.tsx`:** presentational `RecapView({ state,
  onHome, onPlayAgain? })` — winner + crown, final standings **ranked by
  `netWorth`** (bankrupt last) with medal, token initial, per-player property
  count + net worth, a stats line (`turnsPlayed` from `state.turnId`), and a
  native **Share** (`Share.share` with a localized text summary; try/caught so web
  just no-ops). Winner row gets a gold border.
- **Wiring:** `app/game/[roomId]/over.tsx` rewritten to render `RecapView`
  (Home = reset→`/`, Rematch = reset→`/setup`). Online finished room
  (`app/online/[code]/index.tsx`) now shows `RecapView` (Home only — no online
  rematch) in a scroll view instead of the old board + button.
- New i18n keys (`finalStandings`, `turnsPlayed`, `propertiesCount`,
  `shareResult`); reused `winner`/`rematch`/`netWorth`. Used `{{n}}` (not the
  i18next magic `count`) to avoid plural-key resolution surfacing raw keys. app
  tsc + lint clean; web export bundles all 12 routes.

### Remaining for M4 (not code — user/QA)
1. **Apple on-device QA** + Apple Developer setup (see the ⚠️ box above).
2. **Apple account-merge nuance** (low priority): signing in with Apple from a
   guest switches to the Apple-backed user rather than migrating the anonymous
   user's data (fine for transient online rooms). True link-not-replace would
   reassign `games` ownership in `authorize`.

**M4 is code-complete.** Next milestone is **M5 (beta): EAS + TestFlight, Sentry +
analytics, then Android.**

## Milestone 5 — IN PROGRESS 🟢 (beta: build, observability, analytics)

**Scaffolding DONE & verified (2026-06-20).** Everything that can be done without
an Apple Developer account / EAS / a device is in place and inert until secrets
are set.

- **EAS build config (`eas.json`):** `development` (dev client, internal, iOS
  simulator), `preview` (internal, channel `preview`), `production`
  (autoIncrement, channel `production`). Each sets `APP_ENV`, which
  `app.config.ts` layers into `extra.appEnv`. `appVersionSource: remote`. A
  `submit.production` stub for store submission.
- **App identifiers:** `app.json` now has `ios.bundleIdentifier` +
  `android.package` = `com.haidang128.monopoly` (change both + `APPLE_CLIENT_ID`
  together if you pick a different id).
- **Sentry crash reporting:** `@sentry/react-native` installed + added to the
  Expo plugins. New `services/observability` seam: `initObservability()` (called
  first in `app/_layout.tsx`; no-op unless `config.sentryDsn` is set) +
  `captureError(err, ctx)` (reported from the root `ErrorBoundary` via a
  `useEffect`). Inert without `EXPO_PUBLIC_SENTRY_DSN`.
- **Analytics vendor:** `services/analytics/init.ts` → `initAnalytics()` (also
  called in `_layout`) installs a **dev console sink**; a real vendor
  (PostHog/Amplitude) is a one-liner via `setAnalyticsSink` gated on
  `config.analyticsKey` — no call-site churn (everything already `track(...)`s).
- **Verified:** app tsc + lint clean; `expo export --platform web` bundles all 12
  routes (Sentry import is web-safe); `expo config --type prebuild` resolves all
  native plugins (router/audio/localization/secure-store/apple-authentication/
  sentry/splash-screen) with both bundle ids + `usesAppleSignIn` applied.

> ⚠️ **USER STEPS for M5 (need an Apple Developer account + EAS/device — I can't):**
> 1. `npm i -g eas-cli` (if needed) → `eas login` → `eas build:configure`.
> 2. Set build secrets so `EXPO_PUBLIC_*` reach the bundle, e.g.
>    `eas env:create --name EXPO_PUBLIC_CONVEX_URL ...` (and `EXPO_PUBLIC_SENTRY_DSN`,
>    `EXPO_PUBLIC_ANALYTICS_KEY` when chosen). Create the Sentry project to get the DSN.
> 3. `eas build --profile development --platform ios` for a dev client (also
>    unblocks the Apple sign-in + MMKV/fonts on-device QA), then
>    `--profile production` → `eas submit` → TestFlight.
> 4. Add the Sentry auth token (EAS secret `SENTRY_AUTH_TOKEN`) for source-map
>    upload on production builds. Then bugfix pass and Android.

### Remaining for M5
1. Run the actual EAS builds → TestFlight (needs Apple account).
2. Create the Sentry project + set the DSN; pick + wire an analytics vendor.
3. On-device bugfix pass (incl. the M2/M4 QA items), then Android rollout.

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
