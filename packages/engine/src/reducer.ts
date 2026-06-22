/**
 * The authoritative game reducer: `reduce(state, action) -> state`.
 *
 * Pure and deterministic — the rng state lives inside GameState, so replaying
 * the same actions from the same seed always reproduces the same game. This is
 * the single source of truth shared by the pass-and-play (on-device) and online
 * (server) runtimes.
 *
 * Illegal actions throw; callers (UI or server) validate or catch. The online
 * runtime runs this exact function inside an authoritative mutation, so a
 * tampered client cannot fabricate money or dice.
 */

import {
  BOARD,
  BOARD_SIZE,
  GO_POS,
  GROUPS,
  JAIL_POS,
  groupPositions,
} from './board';
import { CO_CARDS, KHI_CARDS, cardAt } from './cards';
import {
  canBuild,
  canSellHouse,
  currentPlayer,
  getPlayer,
  isOwnable,
  labelOf,
  mortgageOf,
  ownsFullGroup,
  priceOf,
  rentFor,
  tileAt,
} from './helpers';
import { rollDice, seedState, shuffle } from './rng';
import type {
  Card,
  GameState,
  HouseRules,
  Localized,
  Player,
  PlayerId,
  PlayerSetup,
  TradeOffer,
} from './types';

export type Action =
  | { type: 'ROLL'; player: PlayerId }
  | { type: 'BUY'; player: PlayerId }
  | { type: 'DECLINE_BUY'; player: PlayerId }
  | { type: 'AUCTION_BID'; player: PlayerId; amount: number }
  | { type: 'AUCTION_PASS'; player: PlayerId }
  | { type: 'BUILD'; player: PlayerId; pos: number }
  | { type: 'SELL_HOUSE'; player: PlayerId; pos: number }
  | { type: 'MORTGAGE'; player: PlayerId; pos: number }
  | { type: 'UNMORTGAGE'; player: PlayerId; pos: number }
  | { type: 'PROPOSE_TRADE'; player: PlayerId; offer: TradeOffer }
  | { type: 'RESPOND_TRADE'; player: PlayerId; accept: boolean }
  | { type: 'PAY_DEBT'; player: PlayerId }
  | { type: 'DECLARE_BANKRUPTCY'; player: PlayerId }
  | { type: 'JAIL_PAY'; player: PlayerId }
  | { type: 'JAIL_CARD'; player: PlayerId }
  | { type: 'JAIL_ROLL'; player: PlayerId }
  | { type: 'END_TURN'; player: PlayerId };

/**
 * The in-state log is a bounded ring of the most recent entries — the UI only
 * shows recent history, and keeping it bounded stops the per-action state clone
 * from growing without limit over a long game.
 */
export const MAX_LOG_ENTRIES = 200;

export const DEFAULT_RULES: HouseRules = {
  startingCash: 15000,
  goSalary: 2000,
  jailFine: 500,
  auctionUnbought: true,
  freeParkingJackpot: false,
};

// ---------------------------------------------------------------------------
// Game creation
// ---------------------------------------------------------------------------

export function createGame(
  setups: PlayerSetup[],
  rules: Partial<HouseRules> = {},
  seed = 1,
): GameState {
  if (setups.length < 2 || setups.length > 6) {
    throw new Error('A game needs 2 to 6 players');
  }
  const merged: HouseRules = { ...DEFAULT_RULES, ...rules };
  const players: Player[] = setups.map((s) => ({
    id: s.id,
    name: s.name,
    token: s.token,
    cash: merged.startingCash,
    position: GO_POS,
    inJail: false,
    jailTurns: 0,
    getOutCards: 0,
    bankrupt: false,
  }));

  let rng = seedState(seed);
  const co = shuffle(
    CO_CARDS.map((_, i) => i),
    rng,
  );
  rng = co.state;
  const khi = shuffle(
    KHI_CARDS.map((_, i) => i),
    rng,
  );
  rng = khi.state;

  return {
    config: { rules: merged, seed },
    players,
    order: setups.map((s) => s.id),
    current: 0,
    phase: 'preRoll',
    dice: null,
    doublesCount: 0,
    holdings: {},
    debt: null,
    pendingPurchase: null,
    auction: null,
    pendingTrade: null,
    decks: { co: co.items, coDiscard: [], khi: khi.items, khiDiscard: [] },
    freeParkingPot: 0,
    rngState: rng,
    log: [],
    winner: null,
    turnId: 1,
    lastCard: null,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function reduce(state: GameState, action: Action): GameState {
  const draft = clone(state);
  const rules = draft.config.rules;

  const log = (vi: string, en: string) => {
    draft.log.push({ turnId: draft.turnId, text: { vi, en } });
    if (draft.log.length > MAX_LOG_ENTRIES) {
      draft.log.splice(0, draft.log.length - MAX_LOG_ENTRIES);
    }
  };
  const fail = (msg: string): never => {
    throw new Error(`Illegal ${action.type}: ${msg}`);
  };
  const requireActorIsCurrent = () => {
    const cur = draft.order[draft.current];
    if (action.player !== cur) fail(`not ${action.player}'s turn`);
  };
  const requirePhase = (...phases: GameState['phase'][]) => {
    if (!phases.includes(draft.phase)) fail(`wrong phase ${draft.phase}`);
  };
  const diceSum = () => (draft.dice ? draft.dice[0] + draft.dice[1] : 0);

  // --- low-level money / movement -----------------------------------------

  const payToBank = (player: Player, amount: number) => {
    player.cash -= amount;
    if (rules.freeParkingJackpot) draft.freeParkingPot += amount;
  };

  /** Charge `amount` from → to. Returns true if deferred to a debt the player can't yet afford. */
  const chargeOrDebt = (
    fromId: PlayerId,
    toId: PlayerId | 'bank',
    amount: number,
    reason: Localized,
  ): boolean => {
    if (amount <= 0) return false;
    const from = getPlayer(draft, fromId);
    if (from.cash >= amount) {
      if (toId === 'bank') payToBank(from, amount);
      else {
        from.cash -= amount;
        getPlayer(draft, toId).cash += amount;
      }
      return false;
    }
    draft.debt = { from: fromId, to: toId, amount, reason };
    draft.phase = 'mustResolveDebt';
    return true;
  };

  const move = (player: Player, steps: number) => {
    const dest = (player.position + steps) % BOARD_SIZE;
    if (player.position + steps >= BOARD_SIZE) {
      player.cash += rules.goSalary;
      log(`${player.name} qua Xuất Phát, nhận ₫${rules.goSalary}.`, `${player.name} passed GO and collected ₫${rules.goSalary}.`);
    }
    player.position = dest;
  };

  const moveTo = (player: Player, pos: number, collectGo: boolean) => {
    if (collectGo && pos <= player.position) {
      player.cash += rules.goSalary;
      log(`${player.name} qua Xuất Phát, nhận ₫${rules.goSalary}.`, `${player.name} passed GO and collected ₫${rules.goSalary}.`);
    }
    player.position = pos;
  };

  const sendToJail = (player: Player) => {
    player.position = JAIL_POS;
    player.inJail = true;
    player.jailTurns = 0;
    log(`${player.name} vào tù.`, `${player.name} goes to jail.`);
  };

  // --- cards ---------------------------------------------------------------

  const drawCard = (deck: 'co' | 'khi'): Card => {
    const pile = deck === 'co' ? draft.decks.co : draft.decks.khi;
    const discard = deck === 'co' ? draft.decks.coDiscard : draft.decks.khiDiscard;
    if (pile.length === 0) {
      const reshuffled = shuffle(discard, draft.rngState);
      draft.rngState = reshuffled.state;
      pile.push(...reshuffled.items);
      discard.length = 0;
    }
    const idx = pile.shift();
    if (idx === undefined) fail('empty deck');
    discard.push(idx as number);
    return cardAt(deck, idx as number);
  };

  const applyCard = (player: Player, card: Card) => {
    // surface the draw so the UI can reveal it; `draw` only ever increments
    draft.lastCard = { card, draw: (draft.lastCard?.draw ?? 0) + 1 };
    // Prefix with who drew it and from which deck, so the shared log makes clear
    // the card applies to `player` and not whoever is reading it.
    const deckVi = card.deck === 'co' ? 'Cơ Hội' : 'Khí Vận';
    const deckEn = card.deck === 'co' ? 'Chance' : 'Community';
    log(
      `${player.name} rút ${deckVi}: ${card.text.vi}`,
      `${player.name} drew ${deckEn}: ${card.text.en}`,
    );
    const e = card.effect;
    switch (e.kind) {
      case 'collect':
        player.cash += e.amount;
        draft.phase = 'turnEnd';
        return;
      case 'pay':
        if (!chargeOrDebt(player.id, 'bank', e.amount, card.text)) draft.phase = 'turnEnd';
        return;
      case 'moveTo':
        moveTo(player, e.pos, e.collectGo);
        resolveLanding(player);
        return;
      case 'moveBy': {
        const dest = (player.position + e.steps + BOARD_SIZE) % BOARD_SIZE;
        moveTo(player, dest, e.steps > 0 && dest < player.position);
        resolveLanding(player);
        return;
      }
      case 'goToJail':
        sendToJail(player);
        draft.phase = 'turnEnd';
        return;
      case 'getOutOfJail':
        player.getOutCards += 1;
        draft.phase = 'turnEnd';
        return;
      case 'collectFromEach': {
        for (const other of draft.players) {
          if (other.id === player.id || other.bankrupt) continue;
          const take = Math.min(e.amount, other.cash);
          other.cash -= take;
          player.cash += take;
        }
        draft.phase = 'turnEnd';
        return;
      }
      case 'payEach': {
        const others = draft.players.filter((p) => p.id !== player.id && !p.bankrupt);
        const total = e.amount * others.length;
        if (player.cash >= total) {
          for (const o of others) {
            player.cash -= e.amount;
            o.cash += e.amount;
          }
          draft.phase = 'turnEnd';
        } else {
          // Simplified: defer the lump sum to the bank if unaffordable.
          if (!chargeOrDebt(player.id, 'bank', total, card.text)) draft.phase = 'turnEnd';
        }
        return;
      }
      case 'repairs': {
        let houses = 0;
        let hotels = 0;
        for (const [posStr, h] of Object.entries(draft.holdings)) {
          if (h.owner !== player.id) continue;
          if (tileAt(Number(posStr)).kind !== 'property') continue;
          if (h.houses >= 5) hotels++;
          else houses += h.houses;
        }
        const cost = houses * e.perHouse + hotels * e.perHotel;
        if (!chargeOrDebt(player.id, 'bank', cost, card.text)) draft.phase = 'turnEnd';
        return;
      }
    }
  };

  // --- landing resolution --------------------------------------------------

  function resolveLanding(player: Player) {
    const tile = tileAt(player.position);
    switch (tile.kind) {
      case 'go':
      case 'jail': // just visiting
        draft.phase = 'turnEnd';
        return;
      case 'freeparking':
        if (rules.freeParkingJackpot && draft.freeParkingPot > 0) {
          log(`${player.name} nhận hũ Bãi Đỗ Xe ₫${draft.freeParkingPot}.`, `${player.name} scoops the Free Parking pot ₫${draft.freeParkingPot}.`);
          player.cash += draft.freeParkingPot;
          draft.freeParkingPot = 0;
        }
        draft.phase = 'turnEnd';
        return;
      case 'gotojail':
        sendToJail(player);
        draft.phase = 'turnEnd';
        return;
      case 'tax':
        log(`${player.name} nộp ${tile.name.vi} ₫${tile.amount}.`, `${player.name} pays ${tile.name.en} ₫${tile.amount}.`);
        if (!chargeOrDebt(player.id, 'bank', tile.amount, tile.name)) draft.phase = 'turnEnd';
        return;
      case 'event': {
        const card = drawCard(tile.deck);
        applyCard(player, card);
        return;
      }
      case 'property':
      case 'station':
      case 'utility': {
        const holding = draft.holdings[player.position];
        if (!holding) {
          draft.pendingPurchase = player.position;
          draft.phase = 'awaitBuy';
          return;
        }
        if (holding.owner === player.id || holding.mortgaged) {
          draft.phase = 'turnEnd';
          return;
        }
        const rent = rentFor(draft, player.position, diceSum());
        const owner = getPlayer(draft, holding.owner);
        const reason: Localized = {
          vi: `Tiền thuê ${('name' in tile ? tile.name.vi : '')}`,
          en: `Rent for ${'name' in tile ? tile.name.en : ''}`,
        };
        log(`${player.name} trả ${owner.name} tiền thuê ₫${rent}.`, `${player.name} pays ${owner.name} ₫${rent} rent.`);
        if (!chargeOrDebt(player.id, holding.owner, rent, reason)) draft.phase = 'turnEnd';
        return;
      }
    }
  }

  // --- turn flow -----------------------------------------------------------

  const checkWinner = () => {
    const alive = draft.players.filter((p) => !p.bankrupt);
    if (alive.length <= 1) {
      draft.winner = alive[0]?.id ?? null;
      draft.phase = 'gameOver';
      if (draft.winner) {
        const w = getPlayer(draft, draft.winner);
        log(`${w.name} chiến thắng!`, `${w.name} wins!`);
      }
    }
  };

  const endTurn = () => {
    draft.doublesCount = 0;
    draft.dice = null;
    draft.debt = null;
    draft.pendingPurchase = null;
    draft.auction = null;
    checkWinner();
    if (draft.phase === 'gameOver') return;
    let idx = draft.current;
    do {
      idx = (idx + 1) % draft.order.length;
    } while (getPlayer(draft, draft.order[idx]!).bankrupt);
    draft.current = idx;
    draft.turnId += 1;
    draft.phase = currentPlayer(draft).inJail ? 'jailOptions' : 'preRoll';
  };

  // --- ownership transfer on bankruptcy ------------------------------------

  const liquidateTo = (debtor: Player, creditorId: PlayerId | 'bank') => {
    for (const [posStr, h] of Object.entries(draft.holdings)) {
      if (h.owner !== debtor.id) continue;
      const pos = Number(posStr);
      const tile = tileAt(pos);
      if (creditorId === 'bank') {
        delete draft.holdings[pos];
      } else {
        // Sell any buildings back to the bank; cash goes to the creditor.
        if (h.houses > 0 && tile.kind === 'property') {
          getPlayer(draft, creditorId).cash += h.houses * Math.floor(GROUPS[tile.group]!.houseCost / 2);
        }
        h.houses = 0;
        h.owner = creditorId;
      }
    }
    if (creditorId !== 'bank') getPlayer(draft, creditorId).cash += Math.max(0, debtor.cash);
    debtor.cash = 0;
    debtor.bankrupt = true;
    debtor.getOutCards = 0;
    log(`${debtor.name} phá sản.`, `${debtor.name} is bankrupt.`);
  };

  // --- validation for trades ----------------------------------------------

  const validateTrade = (offer: TradeOffer) => {
    const from = getPlayer(draft, offer.from);
    const to = getPlayer(draft, offer.to);
    if (from.bankrupt || to.bankrupt) fail('bankrupt player in trade');
    for (const pos of offer.give.tiles) {
      if (draft.holdings[pos]?.owner !== offer.from) fail(`from does not own ${pos}`);
      if ((draft.holdings[pos]?.houses ?? 0) > 0) fail(`sell houses on ${pos} first`);
    }
    for (const pos of offer.receive.tiles) {
      if (draft.holdings[pos]?.owner !== offer.to) fail(`to does not own ${pos}`);
      if ((draft.holdings[pos]?.houses ?? 0) > 0) fail(`sell houses on ${pos} first`);
    }
    if (from.cash < offer.give.cash) fail('from cannot afford cash');
    if (to.cash < offer.receive.cash) fail('to cannot afford cash');
  };

  // -------------------------------------------------------------------------

  switch (action.type) {
    case 'ROLL': {
      requirePhase('preRoll');
      requireActorIsCurrent();
      const player = currentPlayer(draft);
      const r = rollDice(draft.rngState);
      draft.rngState = r.state;
      draft.dice = r.dice;
      const doubles = r.dice[0] === r.dice[1];
      log(`${player.name} gieo ${r.dice[0]} + ${r.dice[1]}.`, `${player.name} rolls ${r.dice[0]} + ${r.dice[1]}.`);
      if (doubles) draft.doublesCount += 1;
      if (doubles && draft.doublesCount >= 3) {
        sendToJail(player);
        endTurn();
        break;
      }
      move(player, r.dice[0] + r.dice[1]);
      resolveLanding(player);
      break;
    }

    case 'BUY': {
      requirePhase('awaitBuy');
      requireActorIsCurrent();
      const pos = draft.pendingPurchase;
      if (pos === null) fail('nothing to buy');
      const tile = tileAt(pos as number);
      if (!isOwnable(tile)) throw new Error('Illegal BUY: tile not ownable');
      const player = currentPlayer(draft);
      const price = priceOf(tile);
      if (player.cash < price) fail('cannot afford');
      player.cash -= price;
      draft.holdings[pos as number] = { owner: player.id, houses: 0, mortgaged: false };
      draft.pendingPurchase = null;
      draft.phase = 'turnEnd';
      log(`${player.name} mua ${tile.name.vi} ₫${price}.`, `${player.name} buys ${tile.name.en} for ₫${price}.`);
      break;
    }

    case 'DECLINE_BUY': {
      requirePhase('awaitBuy');
      requireActorIsCurrent();
      const pos = draft.pendingPurchase;
      if (pos === null) fail('nothing to decline');
      if (rules.auctionUnbought && draft.players.filter((p) => !p.bankrupt).length > 1) {
        draft.auction = {
          pos: pos as number,
          highBid: 0,
          highBidder: null,
          active: draft.players.filter((p) => !p.bankrupt).map((p) => p.id),
          turn: 0,
        };
        draft.pendingPurchase = null;
        draft.phase = 'auction';
        log(`Đấu giá ${labelOf(tileAt(pos as number)).vi}.`, `Auction for ${labelOf(tileAt(pos as number)).en}.`);
      } else {
        draft.pendingPurchase = null;
        draft.phase = 'turnEnd';
      }
      break;
    }

    case 'AUCTION_BID': {
      requirePhase('auction');
      const a = draft.auction;
      if (!a) fail('no auction');
      if (a!.active[a!.turn] !== action.player) fail('not your bid');
      if (action.amount <= a!.highBid) fail('bid too low');
      if (getPlayer(draft, action.player).cash < action.amount) fail('cannot afford bid');
      a!.highBid = action.amount;
      a!.highBidder = action.player;
      a!.turn = (a!.turn + 1) % a!.active.length;
      break;
    }

    case 'AUCTION_PASS': {
      requirePhase('auction');
      const a = draft.auction;
      if (!a) fail('no auction');
      if (a!.active[a!.turn] !== action.player) fail('not your turn to pass');
      a!.active.splice(a!.turn, 1);
      if (a!.turn >= a!.active.length) a!.turn = 0;
      if (a!.active.length <= 1) {
        // Resolve: highest bidder wins; if no bids, tile stays unowned.
        const winnerId = a!.highBidder;
        if (winnerId && a!.highBid > 0) {
          const winner = getPlayer(draft, winnerId);
          winner.cash -= a!.highBid;
          draft.holdings[a!.pos] = { owner: winnerId, houses: 0, mortgaged: false };
          log(`${winner.name} thắng đấu giá ₫${a!.highBid}.`, `${winner.name} wins the auction for ₫${a!.highBid}.`);
        } else {
          log('Không ai mua. Ô vẫn trống.', 'No bids. Tile stays unowned.');
        }
        draft.auction = null;
        draft.phase = 'turnEnd';
      }
      break;
    }

    case 'BUILD': {
      requirePhase('preRoll', 'turnEnd');
      requireActorIsCurrent();
      if (!canBuild(draft, action.player, action.pos)) fail('cannot build here');
      const tile = tileAt(action.pos);
      if (tile.kind !== 'property') throw new Error('Illegal BUILD: not a property');
      const cost = GROUPS[tile.group]!.houseCost;
      const player = getPlayer(draft, action.player);
      if (player.cash < cost) fail('cannot afford house');
      player.cash -= cost;
      draft.holdings[action.pos]!.houses += 1;
      break;
    }

    case 'SELL_HOUSE': {
      requirePhase('preRoll', 'turnEnd', 'mustResolveDebt', 'jailOptions');
      requireActorIsCurrent();
      if (!canSellHouse(draft, action.player, action.pos)) fail('cannot sell here');
      const tile = tileAt(action.pos);
      if (tile.kind !== 'property') throw new Error('Illegal SELL_HOUSE: not a property');
      draft.holdings[action.pos]!.houses -= 1;
      getPlayer(draft, action.player).cash += Math.floor(GROUPS[tile.group]!.houseCost / 2);
      break;
    }

    case 'MORTGAGE': {
      requirePhase('preRoll', 'turnEnd', 'mustResolveDebt', 'jailOptions');
      requireActorIsCurrent();
      const h = draft.holdings[action.pos];
      if (!h || h.owner !== action.player) throw new Error('Illegal MORTGAGE: not owner');
      if (h.mortgaged) fail('already mortgaged');
      if (h.houses > 0) fail('sell houses first');
      const tile = tileAt(action.pos);
      if (!isOwnable(tile)) throw new Error('Illegal MORTGAGE: not ownable');
      h.mortgaged = true;
      getPlayer(draft, action.player).cash += mortgageOf(tile);
      break;
    }

    case 'UNMORTGAGE': {
      requirePhase('preRoll', 'turnEnd');
      requireActorIsCurrent();
      const h = draft.holdings[action.pos];
      if (!h || h.owner !== action.player) throw new Error('Illegal UNMORTGAGE: not owner');
      if (!h.mortgaged) fail('not mortgaged');
      const tile = tileAt(action.pos);
      if (!isOwnable(tile)) throw new Error('Illegal UNMORTGAGE: not ownable');
      const cost = Math.ceil(mortgageOf(tile) * 1.1);
      const player = getPlayer(draft, action.player);
      if (player.cash < cost) fail('cannot afford to lift mortgage');
      player.cash -= cost;
      h.mortgaged = false;
      break;
    }

    case 'PROPOSE_TRADE': {
      requirePhase('preRoll', 'turnEnd');
      requireActorIsCurrent();
      if (action.offer.from !== action.player) fail('can only propose your own offer');
      validateTrade(action.offer);
      draft.pendingTrade = action.offer;
      log('Đề nghị giao dịch được gửi.', 'Trade offer sent.');
      break;
    }

    case 'RESPOND_TRADE': {
      const offer = draft.pendingTrade;
      if (!offer) fail('no pending trade');
      if (offer!.to !== action.player) fail('only the recipient may respond');
      if (action.accept) {
        validateTrade(offer!);
        const from = getPlayer(draft, offer!.from);
        const to = getPlayer(draft, offer!.to);
        from.cash -= offer!.give.cash;
        to.cash += offer!.give.cash;
        to.cash -= offer!.receive.cash;
        from.cash += offer!.receive.cash;
        for (const pos of offer!.give.tiles) draft.holdings[pos]!.owner = to.id;
        for (const pos of offer!.receive.tiles) draft.holdings[pos]!.owner = from.id;
        log('Giao dịch hoàn tất.', 'Trade completed.');
      } else {
        log('Giao dịch bị từ chối.', 'Trade declined.');
      }
      draft.pendingTrade = null;
      break;
    }

    case 'PAY_DEBT': {
      requirePhase('mustResolveDebt');
      const d = draft.debt;
      if (!d) fail('no debt');
      if (d!.from !== action.player) fail('not your debt');
      const from = getPlayer(draft, action.player);
      if (from.cash < d!.amount) fail('still cannot afford; raise cash or go bankrupt');
      if (d!.to === 'bank') payToBank(from, d!.amount);
      else {
        from.cash -= d!.amount;
        getPlayer(draft, d!.to).cash += d!.amount;
      }
      draft.debt = null;
      draft.phase = 'turnEnd';
      break;
    }

    case 'DECLARE_BANKRUPTCY': {
      requirePhase('mustResolveDebt');
      const d = draft.debt;
      if (!d) fail('no debt');
      if (d!.from !== action.player) fail('not your debt');
      const debtor = getPlayer(draft, action.player);
      liquidateTo(debtor, d!.to);
      draft.debt = null;
      endTurn();
      break;
    }

    case 'JAIL_PAY': {
      requirePhase('jailOptions');
      requireActorIsCurrent();
      const player = currentPlayer(draft);
      if (!player.inJail) fail('not in jail');
      if (player.cash < rules.jailFine) fail('cannot afford fine');
      payToBank(player, rules.jailFine);
      player.inJail = false;
      player.jailTurns = 0;
      draft.phase = 'preRoll';
      log(`${player.name} nộp ₫${rules.jailFine} ra tù.`, `${player.name} pays ₫${rules.jailFine} to leave jail.`);
      break;
    }

    case 'JAIL_CARD': {
      requirePhase('jailOptions');
      requireActorIsCurrent();
      const player = currentPlayer(draft);
      if (!player.inJail) fail('not in jail');
      if (player.getOutCards <= 0) fail('no get-out card');
      player.getOutCards -= 1;
      player.inJail = false;
      player.jailTurns = 0;
      draft.phase = 'preRoll';
      log(`${player.name} dùng thẻ ra tù.`, `${player.name} uses a get-out-of-jail card.`);
      break;
    }

    case 'JAIL_ROLL': {
      requirePhase('jailOptions');
      requireActorIsCurrent();
      const player = currentPlayer(draft);
      if (!player.inJail) fail('not in jail');
      const r = rollDice(draft.rngState);
      draft.rngState = r.state;
      draft.dice = r.dice;
      const doubles = r.dice[0] === r.dice[1];
      log(`${player.name} gieo ${r.dice[0]} + ${r.dice[1]} (trong tù).`, `${player.name} rolls ${r.dice[0]} + ${r.dice[1]} in jail.`);
      if (doubles) {
        player.inJail = false;
        player.jailTurns = 0;
        draft.doublesCount = 0; // no bonus roll from escaping on doubles
        move(player, r.dice[0] + r.dice[1]);
        resolveLanding(player);
      } else {
        player.jailTurns += 1;
        if (player.jailTurns >= 3) {
          // Forced out: pay the fine (or owe it) then move.
          player.inJail = false;
          player.jailTurns = 0;
          const deferred = chargeOrDebt(player.id, 'bank', rules.jailFine, {
            vi: 'Phí ra tù',
            en: 'Jail fine',
          });
          if (!deferred) {
            move(player, r.dice[0] + r.dice[1]);
            resolveLanding(player);
          }
        } else {
          draft.phase = 'turnEnd';
        }
      }
      break;
    }

    case 'END_TURN': {
      requirePhase('turnEnd');
      requireActorIsCurrent();
      const player = currentPlayer(draft);
      const doubles = !!draft.dice && draft.dice[0] === draft.dice[1];
      if (doubles && !player.inJail && !player.bankrupt) {
        draft.dice = null;
        draft.phase = 'preRoll'; // bonus roll, doublesCount preserved
      } else {
        endTurn();
      }
      break;
    }

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action ${JSON.stringify(_exhaustive)}`);
    }
  }

  return draft;
}

// Re-export for convenience so consumers import everything from the reducer.
export { groupPositions, GROUPS, BOARD, ownsFullGroup };
