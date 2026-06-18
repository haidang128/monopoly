import { describe, it, expect } from 'vitest';
import { nextRandom, rollDice, rollDie, shuffle, seedState } from '../src/rng';

describe('seeded rng', () => {
  it('is deterministic for the same seed', () => {
    const a = nextRandom(seedState(123));
    const b = nextRandom(seedState(123));
    expect(a).toEqual(b);
  });

  it('advances state so successive draws differ', () => {
    const first = nextRandom(seedState(1));
    const second = nextRandom(first.state);
    expect(first.value).not.toEqual(second.value);
  });

  it('rolls dice in range 1..6', () => {
    let state = seedState(99);
    for (let i = 0; i < 500; i++) {
      const r = rollDie(state);
      state = r.state;
      expect(r.value).toBeGreaterThanOrEqual(1);
      expect(r.value).toBeLessThanOrEqual(6);
    }
  });

  it('rollDice returns the same pair for the same state', () => {
    const a = rollDice(seedState(7));
    const b = rollDice(seedState(7));
    expect(a.dice).toEqual(b.dice);
  });

  it('shuffle is a deterministic permutation that does not mutate input', () => {
    const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const a = shuffle(input, seedState(5));
    const b = shuffle(input, seedState(5));
    expect(a.items).toEqual(b.items);
    expect(input).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); // untouched
    expect([...a.items].sort((x, y) => x - y)).toEqual(input);
  });
});
