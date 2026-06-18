/** Shared test fixtures. */
import { createGame } from '../src/reducer';
import type { GameState, Holding, PlayerId } from '../src/types';

export const PLAYERS = [
  { id: 'A', name: 'An', token: '#B23A2C' },
  { id: 'B', name: 'Bình', token: '#1565A8' },
  { id: 'C', name: 'Châu', token: '#2BA85A' },
  { id: 'D', name: 'Dũng', token: '#F4C430' },
];

export function game(playerCount = 2, rules = {}, seed = 42): GameState {
  return createGame(PLAYERS.slice(0, playerCount), rules, seed);
}

export function own(
  state: GameState,
  owner: PlayerId,
  pos: number,
  patch: Partial<Holding> = {},
): void {
  state.holdings[pos] = { owner, houses: 0, mortgaged: false, ...patch };
}
