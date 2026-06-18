# @monopoly/engine

The deterministic rules engine for **Cờ Tỷ Phú Việt**. This package is
**framework-agnostic** — no React, Expo, or Convex imports — so the exact same
logic runs in two places:

- **Pass-and-play** (on-device): the client calls `reduce` locally.
- **Online** (authoritative server): a Convex mutation calls `reduce`, so a
  tampered client can never fabricate dice or money.

Because the PRNG state lives inside `GameState`, a game is fully reproducible:
the same seed + the same action sequence always yields the same result. This is
the property that lets the two runtimes stay in lock-step.

## Usage

```ts
import { createGame, reduce } from '@monopoly/engine';

let state = createGame(
  [
    { id: 'A', name: 'An', token: '#B23A2C' },
    { id: 'B', name: 'Bình', token: '#1565A8' },
  ],
  { startingCash: 15000, auctionUnbought: true }, // house rules (optional)
  /* seed */ 42,
);

state = reduce(state, { type: 'ROLL', player: 'A' });
// inspect state.phase to decide what UI to show next:
//   preRoll | awaitBuy | auction | mustResolveDebt | jailOptions | turnEnd | gameOver
```

## Design

- `types.ts` — all data shapes (`GameState`, `Player`, `Tile`, `Action`, …).
- `rng.ts` — seeded mulberry32 PRNG; state threaded through `GameState.rngState`.
- `board.ts` — the original 40-tile Vietnamese board (8 city tiers, 4 stations,
  2 utilities). All content is original — no Hasbro IP.
- `cards.ts` — Cơ Hội / Khí Vận decks as plain-data effects.
- `helpers.ts` — pure reads: rent math, ownership, net worth, build/sell legality.
- `reducer.ts` — `createGame` + `reduce`; the single source of truth for rules.

## Tests

```bash
npm test        # one-shot
npm run test:watch
```

Coverage spans the RNG, board invariants, rent/build rules, every reducer
action, and a self-playing bot that drives a full 4-player game to completion
(asserting cash never goes negative and the result is reproducible per seed).

## Known v1 simplifications

- House/hotel bank supply limits are not enforced.
- A `payEach` card the player cannot afford is deferred to the bank as a lump
  sum rather than split among players.
- Mortgaging checks the individual tile rather than the whole color group.

These are intentional scope cuts for v1 and are safe to tighten later without
changing the public API.
