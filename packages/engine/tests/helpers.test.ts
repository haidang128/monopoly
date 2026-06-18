import { describe, it, expect } from 'vitest';
import { GROUPS } from '../src/board';
import { canBuild, canSellHouse, netWorth, rentFor, maxRaisable } from '../src/helpers';
import { game, own } from './helpers';

// dongbang group occupies positions 11, 13, 14
const G = GROUPS.dongbang!;

describe('rent — properties', () => {
  it('charges base rent for a lone property', () => {
    const g = game();
    own(g, 'A', 11);
    expect(rentFor(g, 11, 7)).toBe(G.rents[0]);
  });

  it('doubles base rent when the full set is owned with no houses', () => {
    const g = game();
    own(g, 'A', 11);
    own(g, 'A', 13);
    own(g, 'A', 14);
    expect(rentFor(g, 11, 7)).toBe(G.rents[1]);
  });

  it('uses the house ladder and hotel rent', () => {
    const g = game();
    own(g, 'A', 11, { houses: 1 });
    expect(rentFor(g, 11, 7)).toBe(G.rents[2]);
    own(g, 'A', 11, { houses: 5 });
    expect(rentFor(g, 11, 7)).toBe(G.rents[6]);
  });

  it('charges nothing when mortgaged', () => {
    const g = game();
    own(g, 'A', 11, { mortgaged: true });
    expect(rentFor(g, 11, 7)).toBe(0);
  });
});

describe('rent — stations and utilities', () => {
  it('scales station rent by how many stations the owner holds', () => {
    const g = game();
    own(g, 'A', 5); // Ga Hà Nội
    expect(rentFor(g, 5, 7)).toBe(400);
    own(g, 'A', 15);
    own(g, 'A', 25);
    expect(rentFor(g, 5, 7)).toBe(1600); // 3 stations
  });

  it('multiplies the dice sum for utilities', () => {
    const g = game();
    own(g, 'A', 12); // Điện Lực
    expect(rentFor(g, 12, 8)).toBe(8 * 4);
    own(g, 'A', 28); // both utilities
    expect(rentFor(g, 12, 8)).toBe(8 * 10);
  });
});

describe('building rules', () => {
  it('forbids building without the full set', () => {
    const g = game();
    own(g, 'A', 11);
    expect(canBuild(g, 'A', 11)).toBe(false);
  });

  it('allows building on a full set and enforces even building', () => {
    const g = game();
    own(g, 'A', 11);
    own(g, 'A', 13);
    own(g, 'A', 14);
    expect(canBuild(g, 'A', 11)).toBe(true);
    g.holdings[11]!.houses = 1; // now uneven
    expect(canBuild(g, 'A', 11)).toBe(false); // must build others first
    expect(canBuild(g, 'A', 13)).toBe(true);
  });

  it('enforces even selling', () => {
    const g = game();
    own(g, 'A', 11, { houses: 2 });
    own(g, 'A', 13, { houses: 1 });
    own(g, 'A', 14, { houses: 1 });
    expect(canSellHouse(g, 'A', 11)).toBe(true);
    expect(canSellHouse(g, 'A', 13)).toBe(false);
  });
});

describe('valuations', () => {
  it('net worth counts cash, mortgage value and buildings', () => {
    const g = game();
    g.players[0]!.cash = 1000;
    own(g, 'A', 11, { houses: 2 });
    const expected = 1000 + G.mortgage + 2 * Math.floor(G.houseCost / 2);
    expect(netWorth(g, 'A')).toBe(expected);
  });

  it('maxRaisable includes cash plus what can be mortgaged/sold', () => {
    const g = game();
    g.players[0]!.cash = 500;
    own(g, 'A', 11, { houses: 1 });
    const expected = 500 + Math.floor(G.houseCost / 2) + G.mortgage;
    expect(maxRaisable(g, 'A')).toBe(expected);
  });
});
