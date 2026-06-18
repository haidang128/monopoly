/**
 * Pure read helpers over GameState: ownership, rent computation, net worth and
 * the legality checks the reducer relies on. No mutation here.
 */

import { BOARD, GROUPS, groupPositions } from './board';
import type {
  GameState,
  Group,
  Localized,
  OwnableTile,
  Player,
  PlayerId,
  Tile,
} from './types';

export function tileAt(pos: number): Tile {
  const t = BOARD[pos];
  if (!t) throw new Error(`No tile at position ${pos}`);
  return t;
}

/** A display label for any tile, including the nameless event tiles. */
export function labelOf(tile: Tile): Localized {
  if ('name' in tile) return tile.name;
  return tile.deck === 'co'
    ? { vi: 'Cơ Hội', en: 'Chance' }
    : { vi: 'Khí Vận', en: 'Community' };
}

export function isOwnable(tile: Tile): tile is OwnableTile {
  return tile.kind === 'property' || tile.kind === 'station' || tile.kind === 'utility';
}

export function priceOf(tile: OwnableTile): number {
  if (tile.kind === 'property') return GROUPS[tile.group]!.price;
  return tile.price;
}

export function mortgageOf(tile: OwnableTile): number {
  if (tile.kind === 'property') return GROUPS[tile.group]!.mortgage;
  return tile.mortgage;
}

export function getPlayer(state: GameState, id: PlayerId): Player {
  const p = state.players.find((pl) => pl.id === id);
  if (!p) throw new Error(`Unknown player ${id}`);
  return p;
}

export function currentPlayer(state: GameState): Player {
  const id = state.order[state.current];
  if (!id) throw new Error('No current player');
  return getPlayer(state, id);
}

export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.bankrupt);
}

/** Does `playerId` own every tile in the color group? */
export function ownsFullGroup(state: GameState, playerId: PlayerId, groupId: string): boolean {
  const positions = groupPositions(groupId);
  return positions.every((pos) => state.holdings[pos]?.owner === playerId);
}

/** Count how many tiles of a given kind a player owns (for stations/utilities). */
function countOwnedKind(state: GameState, playerId: PlayerId, kind: Tile['kind']): number {
  let n = 0;
  for (const [pos, h] of Object.entries(state.holdings)) {
    if (h.owner === playerId && tileAt(Number(pos)).kind === kind) n++;
  }
  return n;
}

/**
 * Rent owed for landing on an owned tile. `diceSum` is required for utilities.
 * Mortgaged tiles charge nothing.
 */
export function rentFor(state: GameState, pos: number, diceSum: number): number {
  const holding = state.holdings[pos];
  if (!holding || holding.mortgaged) return 0;
  const tile = tileAt(pos);

  if (tile.kind === 'property') {
    const group: Group = GROUPS[tile.group]!;
    const { houses } = holding;
    if (houses >= 5) return group.rents[6];
    if (houses >= 1) return group.rents[houses + 1]!; // 1 house -> rents[2]
    // no houses: double base if the owner holds the full group
    return ownsFullGroup(state, holding.owner, tile.group) ? group.rents[1] : group.rents[0];
  }

  if (tile.kind === 'station') {
    const owned = countOwnedKind(state, holding.owner, 'station');
    return tile.rents[Math.min(owned, 4) - 1] ?? 0;
  }

  if (tile.kind === 'utility') {
    const owned = countOwnedKind(state, holding.owner, 'utility');
    const mult = owned >= 2 ? tile.multipliers[1] : tile.multipliers[0];
    return diceSum * mult;
  }

  return 0;
}

/** Liquid value a player could raise right now (mortgage + sell all buildings). */
export function maxRaisable(state: GameState, playerId: PlayerId): number {
  let total = state.players.find((p) => p.id === playerId)?.cash ?? 0;
  for (const [posStr, h] of Object.entries(state.holdings)) {
    if (h.owner !== playerId) continue;
    const tile = tileAt(Number(posStr));
    if (!isOwnable(tile)) continue;
    if (h.houses > 0 && tile.kind === 'property') {
      total += h.houses * Math.floor(GROUPS[tile.group]!.houseCost / 2);
    }
    if (!h.mortgaged) total += mortgageOf(tile);
  }
  return total;
}

/** Net worth: cash + (mortgage value of unmortgaged tiles) + building resale value. */
export function netWorth(state: GameState, playerId: PlayerId): number {
  const player = getPlayer(state, playerId);
  let total = player.cash;
  for (const [posStr, h] of Object.entries(state.holdings)) {
    if (h.owner !== playerId) continue;
    const tile = tileAt(Number(posStr));
    if (!isOwnable(tile)) continue;
    if (!h.mortgaged) total += mortgageOf(tile);
    if (tile.kind === 'property' && h.houses > 0) {
      total += h.houses * Math.floor(GROUPS[tile.group]!.houseCost / 2);
    }
  }
  return total;
}

/** Even-building rule: houses across a group may differ by at most one. */
export function canBuild(state: GameState, playerId: PlayerId, pos: number): boolean {
  const tile = tileAt(pos);
  if (tile.kind !== 'property') return false;
  const holding = state.holdings[pos];
  if (!holding || holding.owner !== playerId) return false;
  if (holding.mortgaged) return false;
  if (!ownsFullGroup(state, playerId, tile.group)) return false;
  if (holding.houses >= 5) return false;
  // no mortgaged tile anywhere in the group
  const positions = groupPositions(tile.group);
  if (positions.some((p) => state.holdings[p]?.mortgaged)) return false;
  // even building: cannot exceed the group minimum + 1
  const min = Math.min(...positions.map((p) => state.holdings[p]?.houses ?? 0));
  return holding.houses <= min;
}

/** Even-selling rule mirror of {@link canBuild}. */
export function canSellHouse(state: GameState, playerId: PlayerId, pos: number): boolean {
  const tile = tileAt(pos);
  if (tile.kind !== 'property') return false;
  const holding = state.holdings[pos];
  if (!holding || holding.owner !== playerId || holding.houses <= 0) return false;
  const positions = groupPositions(tile.group);
  const max = Math.max(...positions.map((p) => state.holdings[p]?.houses ?? 0));
  return holding.houses >= max;
}
