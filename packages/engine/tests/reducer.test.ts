import { describe, it, expect } from 'vitest';
import { createGame, reduce, type Action } from '../src/reducer';
import { GROUPS } from '../src/board';
import { canSellHouse, getPlayer, isOwnable, priceOf, tileAt } from '../src/helpers';
import type { GameState } from '../src/types';
import { game, own, PLAYERS } from './helpers';

describe('createGame', () => {
  it('seats 2..6 players with starting cash and a full deck', () => {
    const g = game(4);
    expect(g.players).toHaveLength(4);
    expect(g.players.every((p) => p.cash === g.config.rules.startingCash)).toBe(true);
    expect(g.decks.co.length + g.decks.coDiscard.length).toBeGreaterThan(0);
    expect(g.phase).toBe('preRoll');
  });

  it('rejects bad player counts', () => {
    expect(() => createGame(PLAYERS.slice(0, 1))).toThrow();
    expect(() => createGame([...PLAYERS, ...PLAYERS])).toThrow();
  });
});

describe('determinism', () => {
  it('produces identical results for the same action on the same state', () => {
    const g = game();
    const a = reduce(g, { type: 'ROLL', player: 'A' });
    const b = reduce(g, { type: 'ROLL', player: 'A' });
    expect(a).toEqual(b);
  });

  it('does not mutate the input state', () => {
    const g = game();
    const snapshot = JSON.stringify(g);
    reduce(g, { type: 'ROLL', player: 'A' });
    expect(JSON.stringify(g)).toBe(snapshot);
  });
});

describe('buying and auctions', () => {
  it('buys an unowned property and debits the price', () => {
    const g = game();
    g.phase = 'awaitBuy';
    g.pendingPurchase = 11; // Nam Định (dongbang)
    const before = g.players[0]!.cash;
    const next = reduce(g, { type: 'BUY', player: 'A' });
    expect(next.holdings[11]!.owner).toBe('A');
    expect(next.players[0]!.cash).toBe(before - GROUPS.dongbang!.price);
    expect(next.phase).toBe('turnEnd');
  });

  it('declining with auctions off just ends the decision', () => {
    const g = game(2, { auctionUnbought: false });
    g.phase = 'awaitBuy';
    g.pendingPurchase = 11;
    const next = reduce(g, { type: 'DECLINE_BUY', player: 'A' });
    expect(next.phase).toBe('turnEnd');
    expect(next.holdings[11]).toBeUndefined();
  });

  it('runs an auction to the highest bidder', () => {
    let g = game(2);
    g.phase = 'awaitBuy';
    g.pendingPurchase = 11;
    g = reduce(g, { type: 'DECLINE_BUY', player: 'A' });
    expect(g.phase).toBe('auction');
    g = reduce(g, { type: 'AUCTION_BID', player: 'A', amount: 300 });
    g = reduce(g, { type: 'AUCTION_PASS', player: 'B' });
    expect(g.holdings[11]!.owner).toBe('A');
    expect(g.phase).toBe('turnEnd');
  });
});

describe('asset management', () => {
  it('mortgages and lifts a mortgage with interest', () => {
    const g = game();
    own(g, 'A', 11);
    const start = g.players[0]!.cash;
    let next = reduce(g, { type: 'MORTGAGE', player: 'A', pos: 11 });
    expect(next.holdings[11]!.mortgaged).toBe(true);
    expect(next.players[0]!.cash).toBe(start + GROUPS.dongbang!.mortgage);
    next = reduce(next, { type: 'UNMORTGAGE', player: 'A', pos: 11 });
    expect(next.holdings[11]!.mortgaged).toBe(false);
    const cost = Math.ceil(GROUPS.dongbang!.mortgage * 1.1);
    expect(next.players[0]!.cash).toBe(start + GROUPS.dongbang!.mortgage - cost);
  });

  it('builds evenly and rejects an uneven build', () => {
    const g = game();
    own(g, 'A', 11);
    own(g, 'A', 13);
    own(g, 'A', 14);
    const next = reduce(g, { type: 'BUILD', player: 'A', pos: 11 });
    expect(next.holdings[11]!.houses).toBe(1);
    expect(() => reduce(next, { type: 'BUILD', player: 'A', pos: 11 })).toThrow();
  });

  it('transfers tiles and cash on an accepted trade', () => {
    const g = game();
    own(g, 'A', 11);
    own(g, 'B', 26);
    const aCash = g.players[0]!.cash;
    const bCash = g.players[1]!.cash;
    let next = reduce(g, {
      type: 'PROPOSE_TRADE',
      player: 'A',
      offer: {
        from: 'A',
        to: 'B',
        give: { cash: 100, tiles: [11] },
        receive: { cash: 0, tiles: [26] },
      },
    });
    next = reduce(next, { type: 'RESPOND_TRADE', player: 'B', accept: true });
    expect(next.holdings[11]!.owner).toBe('B');
    expect(next.holdings[26]!.owner).toBe('A');
    expect(next.players[0]!.cash).toBe(aCash - 100);
    expect(next.players[1]!.cash).toBe(bCash + 100);
    expect(next.pendingTrade).toBeNull();
  });
});

describe('debt, bankruptcy and jail', () => {
  it('settles an affordable debt', () => {
    const g = game();
    g.phase = 'mustResolveDebt';
    g.players[0]!.cash = 500;
    g.debt = { from: 'A', to: 'B', amount: 200, reason: { vi: 'x', en: 'x' } };
    const next = reduce(g, { type: 'PAY_DEBT', player: 'A' });
    expect(next.players[0]!.cash).toBe(300);
    expect(next.players[1]!.cash).toBe(g.players[1]!.cash + 200);
    expect(next.phase).toBe('turnEnd');
  });

  it('ends the game when the last solvent player remains', () => {
    const g = game(2);
    g.phase = 'mustResolveDebt';
    g.players[0]!.cash = 10;
    g.debt = { from: 'A', to: 'B', amount: 999999, reason: { vi: 'x', en: 'x' } };
    const next = reduce(g, { type: 'DECLARE_BANKRUPTCY', player: 'A' });
    expect(next.players[0]!.bankrupt).toBe(true);
    expect(next.phase).toBe('gameOver');
    expect(next.winner).toBe('B');
  });

  it('lets a jailed player pay the fine to get out', () => {
    const g = game();
    g.players[0]!.inJail = true;
    g.players[0]!.position = 10;
    g.phase = 'jailOptions';
    const start = g.players[0]!.cash;
    const next = reduce(g, { type: 'JAIL_PAY', player: 'A' });
    expect(next.players[0]!.inJail).toBe(false);
    expect(next.players[0]!.cash).toBe(start - g.config.rules.jailFine);
    expect(next.phase).toBe('preRoll');
  });
});

// --- Integration: a self-playing bot exercises every path ------------------

const VALID_PHASES = new Set<GameState['phase']>([
  'preRoll',
  'awaitBuy',
  'auction',
  'mustResolveDebt',
  'jailOptions',
  'turnEnd',
  'gameOver',
]);

function botAction(s: GameState): Action {
  const cur = s.order[s.current]!;
  switch (s.phase) {
    case 'preRoll':
      return { type: 'ROLL', player: cur };
    case 'turnEnd':
      return { type: 'END_TURN', player: cur };
    case 'jailOptions':
      return { type: 'JAIL_ROLL', player: cur };
    case 'awaitBuy': {
      const tile = tileAt(s.pendingPurchase!);
      const price = isOwnable(tile) ? priceOf(tile) : Infinity;
      return getPlayer(s, cur).cash >= price
        ? { type: 'BUY', player: cur }
        : { type: 'DECLINE_BUY', player: cur };
    }
    case 'auction': {
      const bidder = s.auction!.active[s.auction!.turn]!;
      return { type: 'AUCTION_PASS', player: bidder };
    }
    case 'mustResolveDebt': {
      const d = s.debt!;
      const debtor = getPlayer(s, d.from);
      if (debtor.cash >= d.amount) return { type: 'PAY_DEBT', player: d.from };
      const sellable = Object.entries(s.holdings).find(
        ([pos, h]) => h.owner === d.from && h.houses > 0 && canSellHouse(s, d.from, Number(pos)),
      );
      if (sellable) return { type: 'SELL_HOUSE', player: d.from, pos: Number(sellable[0]) };
      const mortgageable = Object.entries(s.holdings).find(
        ([, h]) => h.owner === d.from && !h.mortgaged && h.houses === 0,
      );
      if (mortgageable) return { type: 'MORTGAGE', player: d.from, pos: Number(mortgageable[0]) };
      return { type: 'DECLARE_BANKRUPTCY', player: d.from };
    }
    default:
      throw new Error(`bot has no move for phase ${s.phase}`);
  }
}

// Invariants are checked with plain throws (not `expect`) so the hot loop stays
// fast over tens of thousands of steps.
function playOut(seed: number, maxSteps = 20000): GameState {
  let s = game(4, {}, seed);
  for (let i = 0; i < maxSteps && s.phase !== 'gameOver'; i++) {
    s = reduce(s, botAction(s));
    if (!VALID_PHASES.has(s.phase)) throw new Error(`invalid phase ${s.phase}`);
    for (const p of s.players) {
      if (p.cash < 0) throw new Error(`negative cash for ${p.id}`);
    }
  }
  return s;
}

describe('full-game integration', () => {
  it('plays a 4-player game to completion without illegal states', () => {
    // Most seeds bankrupt three players within the budget; scan a few so the
    // test is robust to a single unusually long game.
    let finished: GameState | undefined;
    for (const seed of [2026, 1, 2, 3, 7, 11, 42, 99]) {
      const s = playOut(seed);
      if (s.phase === 'gameOver') {
        finished = s;
        break;
      }
    }
    expect(finished).toBeDefined();
    expect(finished!.winner).not.toBeNull();
    expect(finished!.players.filter((p) => !p.bankrupt)).toHaveLength(1);
  });

  it('is fully reproducible from the same seed', () => {
    expect(playOut(7)).toEqual(playOut(7));
  });
});
