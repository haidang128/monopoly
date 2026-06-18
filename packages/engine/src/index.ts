/**
 * @monopoly/engine — public surface.
 *
 * Framework-agnostic, deterministic rules for Cờ Tỷ Phú Việt. Import from here
 * in both the client (pass-and-play) and the Convex server (online) so the two
 * runtimes share one source of truth.
 */

export * from './types';
export * from './board';
export * from './cards';
export * from './rng';
export * from './helpers';
export { reduce, createGame, DEFAULT_RULES } from './reducer';
export type { Action } from './reducer';
