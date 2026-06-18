/**
 * Core types for the Cờ Tỷ Phú Việt game engine.
 *
 * This module is framework-agnostic: no React, Expo, or Convex imports. The same
 * types drive the on-device (pass-and-play) runtime and the authoritative server
 * (online) runtime.
 */

export type Locale = 'vi' | 'en';

/** A string that exists in both supported languages. */
export interface Localized {
  vi: string;
  en: string;
}

/** Player id — a stable string (device-local seat id or server seat id). */
export type PlayerId = string;

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export type TileKind =
  | 'go'
  | 'property' // a city (color group)
  | 'station' // "GA" — railroad equivalent
  | 'utility' // điện lực / cấp nước
  | 'event' // Cơ Hội (chance) / Khí Vận (community)
  | 'tax'
  | 'jail' // just visiting / in jail
  | 'gotojail'
  | 'freeparking';

export type EventDeck = 'co' | 'khi';

/** A color set / tier (e.g. Elite, Premium, Prime …). */
export interface Group {
  id: string;
  name: Localized;
  color: string; // hex, matches the hi-fi design palette
  /** Rent ladder applied to every city in the group: [base, fullSet, h1, h2, h3, h4, hotel]. */
  rents: readonly [number, number, number, number, number, number, number];
  price: number;
  houseCost: number;
  mortgage: number;
}

interface BaseTile {
  /** Position on the 40-tile ring, 0..39. */
  pos: number;
  kind: TileKind;
}

export interface PropertyTile extends BaseTile {
  kind: 'property';
  id: string;
  name: Localized;
  group: string; // Group.id
}

export interface StationTile extends BaseTile {
  kind: 'station';
  id: string;
  name: Localized;
  price: number;
  /** Rent by number of stations the owner holds: [1,2,3,4]. */
  rents: readonly [number, number, number, number];
  mortgage: number;
}

export interface UtilityTile extends BaseTile {
  kind: 'utility';
  id: string;
  name: Localized;
  price: number;
  mortgage: number;
  /** Rent multiplier on dice sum by number of utilities owned: [one, both]. */
  multipliers: readonly [number, number];
}

export interface EventTile extends BaseTile {
  kind: 'event';
  deck: EventDeck;
}

export interface TaxTile extends BaseTile {
  kind: 'tax';
  name: Localized;
  amount: number;
}

export interface SimpleTile extends BaseTile {
  kind: 'go' | 'jail' | 'gotojail' | 'freeparking';
  name: Localized;
}

export type Tile =
  | PropertyTile
  | StationTile
  | UtilityTile
  | EventTile
  | TaxTile
  | SimpleTile;

/** A purchasable tile (property, station or utility). */
export type OwnableTile = PropertyTile | StationTile | UtilityTile;

// ---------------------------------------------------------------------------
// Event cards
// ---------------------------------------------------------------------------

export type CardEffect =
  | { kind: 'collect'; amount: number }
  | { kind: 'pay'; amount: number }
  | { kind: 'moveTo'; pos: number; collectGo: boolean }
  | { kind: 'moveBy'; steps: number }
  | { kind: 'goToJail' }
  | { kind: 'getOutOfJail' }
  | { kind: 'collectFromEach'; amount: number }
  | { kind: 'payEach'; amount: number }
  | { kind: 'repairs'; perHouse: number; perHotel: number };

export interface Card {
  id: string;
  deck: EventDeck;
  text: Localized;
  effect: CardEffect;
}

// ---------------------------------------------------------------------------
// Mutable game state
// ---------------------------------------------------------------------------

export interface Player {
  id: PlayerId;
  name: string;
  token: string; // color hex
  cash: number;
  position: number; // 0..39
  inJail: boolean;
  jailTurns: number;
  getOutCards: number;
  bankrupt: boolean;
}

/** Per-tile ownership; only present for owned tiles, keyed by tile position. */
export interface Holding {
  owner: PlayerId;
  houses: number; // 0..4 houses, 5 = hotel
  mortgaged: boolean;
}

export interface Debt {
  from: PlayerId;
  /** Creditor — another player, or the bank. */
  to: PlayerId | 'bank';
  amount: number;
  reason: Localized;
}

export interface AuctionState {
  pos: number; // tile being auctioned
  highBid: number;
  highBidder: PlayerId | null;
  /** Players still in the auction (have not passed). */
  active: PlayerId[];
  turn: number; // index into `active` whose bid/pass we await
}

export interface TradeItem {
  cash: number;
  tiles: number[]; // positions of ownable tiles
}

export interface TradeOffer {
  from: PlayerId;
  to: PlayerId;
  give: TradeItem; // what `from` gives
  receive: TradeItem; // what `from` receives from `to`
}

export type Phase =
  | 'preRoll' // current player may manage assets / trade, then ROLL
  | 'awaitBuy' // landed on an unowned ownable: BUY or DECLINE_BUY
  | 'auction'
  | 'mustResolveDebt' // owes money but cannot afford: raise cash or go bankrupt
  | 'jailOptions' // current player is in jail at start of turn
  | 'turnEnd' // post-resolution, may manage then END_TURN
  | 'gameOver';

export interface LogEntry {
  turnId: number;
  text: Localized;
}

export interface HouseRules {
  startingCash: number;
  goSalary: number;
  jailFine: number;
  auctionUnbought: boolean;
  freeParkingJackpot: boolean;
}

export interface GameConfig {
  rules: HouseRules;
  seed: number;
}

export interface GameState {
  config: GameConfig;
  players: Player[];
  /** Seat order — player ids in turn order. */
  order: PlayerId[];
  current: number; // index into `order`
  phase: Phase;
  dice: readonly [number, number] | null;
  doublesCount: number;
  holdings: Record<number, Holding>;
  debt: Debt | null;
  pendingPurchase: number | null;
  auction: AuctionState | null;
  pendingTrade: TradeOffer | null;
  /** Draw piles and discard piles as arrays of indices into the card tables. */
  decks: { co: number[]; coDiscard: number[]; khi: number[]; khiDiscard: number[] };
  freeParkingPot: number;
  rngState: number;
  log: LogEntry[];
  winner: PlayerId | null;
  turnId: number;
  /**
   * The most recently drawn event card plus a monotonic draw counter, so a UI
   * (local or online client) can reveal each draw exactly once. `null` until the
   * first card is drawn; thereafter it persists, with `draw` changing only on a
   * genuine new draw.
   */
  lastCard: { card: Card; draw: number } | null;
}

export interface PlayerSetup {
  id: PlayerId;
  name: string;
  token: string;
}
