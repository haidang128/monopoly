/**
 * Deterministic seeded PRNG (mulberry32).
 *
 * The whole engine is reproducible: the same seed + the same action sequence
 * always yields the same game. We thread the generator's 32-bit state through
 * `GameState.rngState` rather than holding a closure, so state stays plain and
 * serializable for the online (server-authoritative) runtime.
 */

/** Advance the state once and return the next state + a float in [0, 1). */
export function nextRandom(state: number): { state: number; value: number } {
  // mulberry32
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: t >>> 0, value };
}

/** Roll a single die (1..6), returning the new rng state. */
export function rollDie(state: number): { state: number; value: number } {
  const r = nextRandom(state);
  return { state: r.state, value: Math.floor(r.value * 6) + 1 };
}

/** Roll two dice, returning the new rng state. */
export function rollDice(state: number): {
  state: number;
  dice: [number, number];
} {
  const a = rollDie(state);
  const b = rollDie(a.state);
  return { state: b.state, dice: [a.value, b.value] };
}

/**
 * Fisher–Yates shuffle of `items` using the seeded generator. Returns a new
 * array and the advanced rng state (input is not mutated).
 */
export function shuffle<T>(items: readonly T[], state: number): { state: number; items: T[] } {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextRandom(s);
    s = r.state;
    const j = Math.floor(r.value * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return { state: s, items: out };
}

/** Derive an initial 32-bit rng state from an arbitrary numeric seed. */
export function seedState(seed: number): number {
  return seed >>> 0;
}
