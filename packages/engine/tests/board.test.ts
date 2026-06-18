import { describe, it, expect } from 'vitest';
import { BOARD, GROUPS, STATION_POSITIONS, UTILITY_POSITIONS, groupPositions } from '../src/board';

describe('board layout', () => {
  it('has 40 tiles at unique sequential positions', () => {
    expect(BOARD).toHaveLength(40);
    BOARD.forEach((t, i) => expect(t.pos).toBe(i));
  });

  it('has the four corners in the classic spots', () => {
    expect(BOARD[0]!.kind).toBe('go');
    expect(BOARD[10]!.kind).toBe('jail');
    expect(BOARD[20]!.kind).toBe('freeparking');
    expect(BOARD[30]!.kind).toBe('gotojail');
  });

  it('has 22 city tiles spread across 8 groups', () => {
    const cities = BOARD.filter((t) => t.kind === 'property');
    expect(cities).toHaveLength(22);
    expect(Object.keys(GROUPS)).toHaveLength(8);
  });

  it('has 4 stations and 2 utilities', () => {
    expect(STATION_POSITIONS).toHaveLength(4);
    expect(UTILITY_POSITIONS).toHaveLength(2);
  });

  it('groups have 2 or 3 cities each', () => {
    for (const id of Object.keys(GROUPS)) {
      const n = groupPositions(id).length;
      expect(n === 2 || n === 3).toBe(true);
    }
  });

  it('prices ascend from cheapest to elite group', () => {
    expect(GROUPS.venVung!.price).toBeLessThan(GROUPS.caocap!.price);
  });
});
