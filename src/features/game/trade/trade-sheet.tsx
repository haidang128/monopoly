/**
 * Trade sheet — compose and respond to a two-sided trade.
 *
 * Two stages driven by authoritative state:
 *   1. **Compose** — the current player (the only one who may `PROPOSE_TRADE`)
 *      picks a partner, toggles tiles to give/receive and sets cash on each side.
 *   2. **Review** — once `state.pendingTrade` is set, the device passes to the
 *      recipient, who `RESPOND_TRADE`s accept/decline.
 *
 * Reuses the portfolio holding-row visual language (group band, mortgage badge).
 * Dispatches engine `Action`s; the same component works for the online runtime
 * since both share the `GameState` / `Action` contract.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  BOARD,
  GROUPS,
  type Action,
  type GameState,
  type OwnableTile,
  type PlayerId,
  type TradeItem,
  isOwnable,
  labelOf,
} from '@monopoly/engine';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

interface TradeSheetProps {
  state: GameState;
  dispatch: (action: Action) => void;
  /** Last engine error, surfaced if a proposal is rejected. */
  error?: string | null;
  /** Called after a terminal action (proposal sent → review, or responded). */
  onDone: () => void;
}

export function TradeSheet({ state, dispatch, error, onDone }: TradeSheetProps) {
  if (state.pendingTrade) {
    return <ReviewStage state={state} dispatch={dispatch} onDone={onDone} />;
  }
  return <ComposeStage state={state} dispatch={dispatch} error={error} />;
}

// --- compose ----------------------------------------------------------------

function ComposeStage({
  state,
  dispatch,
  error,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
  error?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';

  const me = state.players.find((p) => p.id === state.order[state.current]);
  const partners = state.players.filter((p) => p.id !== me?.id && !p.bankrupt);

  const [partnerId, setPartnerId] = useState<PlayerId>(partners[0]?.id ?? '');
  const partner = state.players.find((p) => p.id === partnerId) ?? partners[0];

  const [give, setGive] = useState<Set<number>>(new Set());
  const [receive, setReceive] = useState<Set<number>>(new Set());
  const [giveCash, setGiveCash] = useState(0);
  const [receiveCash, setReceiveCash] = useState(0);

  const canTrade = state.phase === 'preRoll' || state.phase === 'turnEnd';
  const myTiles = me ? tradableTiles(state, me.id) : [];
  const partnerTiles = partner ? tradableTiles(state, partner.id) : [];

  if (!me) return null;
  if (!canTrade) {
    return <Centered>{t('tradeOnYourTurn')}</Centered>;
  }
  if (!partner) {
    return <Centered>{t('nothingToTrade')}</Centered>;
  }

  const giveCashClamped = clamp(giveCash, 0, me.cash);
  const receiveCashClamped = clamp(receiveCash, 0, partner.cash);
  const empty =
    give.size === 0 && receive.size === 0 && giveCashClamped === 0 && receiveCashClamped === 0;

  const propose = () => {
    dispatch({
      type: 'PROPOSE_TRADE',
      player: me.id,
      offer: {
        from: me.id,
        to: partner.id,
        give: { cash: giveCashClamped, tiles: [...give] },
        receive: { cash: receiveCashClamped, tiles: [...receive] },
      },
    });
  };

  return (
    <View style={styles.root}>
      {/* partner selector */}
      <Text style={styles.heading}>{t('tradeWith')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {partners.map((p) => {
          const active = p.id === partner.id;
          return (
            <Text
              key={p.id}
              onPress={() => {
                setPartnerId(p.id);
                setReceive(new Set());
                setReceiveCash(0);
              }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={{ color: p.token }}>● </Text>
              {p.name}
            </Text>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <TradeColumn
          state={state}
          title={`${t('youGive')} · ${me.name}`}
          tiles={myTiles}
          selected={give}
          onToggle={(pos) => setGive(toggle(give, pos))}
          cash={giveCashClamped}
          maxCash={me.cash}
          onCash={setGiveCash}
          locale={locale}
          t={t}
        />
        <TradeColumn
          state={state}
          title={`${t('youReceive')} · ${partner.name}`}
          tiles={partnerTiles}
          selected={receive}
          onToggle={(pos) => setReceive(toggle(receive, pos))}
          cash={receiveCashClamped}
          maxCash={partner.cash}
          onCash={setReceiveCash}
          locale={locale}
          t={t}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <Button label={t('propose')} disabled={empty} onPress={propose} />
    </View>
  );
}

function TradeColumn({
  state,
  title,
  tiles,
  selected,
  onToggle,
  cash,
  maxCash,
  onCash,
  locale,
  t,
}: {
  state: GameState;
  title: string;
  tiles: OwnableTile[];
  selected: Set<number>;
  onToggle: (pos: number) => void;
  cash: number;
  maxCash: number;
  onCash: (n: number) => void;
  locale: 'vi' | 'en';
  t: (key: string) => string;
}) {
  return (
    <View style={styles.column}>
      <Text style={styles.colTitle}>{title}</Text>

      {/* cash row */}
      <View style={styles.cashRow}>
        <Text style={styles.cashLabel}>{t('cash')}</Text>
        <TextInput
          style={styles.cashInput}
          keyboardType="number-pad"
          value={cash ? String(cash) : ''}
          placeholder="0"
          placeholderTextColor={Brand.muted}
          onChangeText={(text) => {
            const n = Number(text.replace(/[^0-9]/g, '')) || 0;
            onCash(Math.min(n, maxCash));
          }}
        />
        <Text style={styles.cashMax}>/ {formatDong(maxCash)}</Text>
      </View>

      {tiles.length === 0 ? (
        <Text style={styles.colEmpty}>{t('nothingToTrade')}</Text>
      ) : (
        tiles.map((tile) => (
          <TileToggle
            key={tile.pos}
            tile={tile}
            mortgaged={!!state.holdings[tile.pos]?.mortgaged}
            selected={selected.has(tile.pos)}
            onToggle={() => onToggle(tile.pos)}
            locale={locale}
            t={t}
          />
        ))
      )}
    </View>
  );
}

function TileToggle({
  tile,
  mortgaged,
  selected,
  onToggle,
  locale,
  t,
}: {
  tile: OwnableTile;
  mortgaged: boolean;
  selected: boolean;
  onToggle: () => void;
  locale: 'vi' | 'en';
  t: (key: string) => string;
}) {
  const color = tile.kind === 'property' ? GROUPS[tile.group]?.color : Brand.muted;
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.tile, selected && styles.tileSelected]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.band, { backgroundColor: color }]} />
      <Text style={styles.tileName} numberOfLines={1}>
        {labelOf(tile)[locale]}
      </Text>
      {mortgaged && <Text style={styles.mortBadge}>{t('mortgaged')}</Text>}
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>
    </Pressable>
  );
}

// --- review ------------------------------------------------------------------

function ReviewStage({
  state,
  dispatch,
  onDone,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const offer = state.pendingTrade!;
  const from = state.players.find((p) => p.id === offer.from);
  const to = state.players.find((p) => p.id === offer.to);
  if (!from || !to) return null;

  const respond = (accept: boolean) => {
    dispatch({ type: 'RESPOND_TRADE', player: to.id, accept });
    onDone();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>{t('passToRespond', { name: to.name })}</Text>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* from the recipient's perspective: they receive `give`, give up `receive` */}
        <ReviewItem title={t('youReceive')} item={offer.give} locale={locale} t={t} />
        <ReviewItem title={t('youGive')} item={offer.receive} locale={locale} t={t} />
      </ScrollView>
      <View style={styles.reviewActions}>
        <Button label={t('accept')} style={styles.flex} onPress={() => respond(true)} />
        <Button
          label={t('decline')}
          variant="outline"
          style={styles.flex}
          onPress={() => respond(false)}
        />
      </View>
    </View>
  );
}

function ReviewItem({
  title,
  item,
  locale,
  t,
}: {
  title: string;
  item: TradeItem;
  locale: 'vi' | 'en';
  t: (key: string) => string;
}) {
  const tiles = item.tiles.map((pos) => BOARD[pos]).filter((tt): tt is OwnableTile => !!tt && isOwnable(tt));
  return (
    <View style={styles.column}>
      <Text style={styles.colTitle}>{title}</Text>
      {item.cash > 0 && (
        <Text style={styles.reviewCash}>
          {t('cash')}: {formatDong(item.cash)}
        </Text>
      )}
      {tiles.length === 0 && item.cash === 0 ? (
        <Text style={styles.colEmpty}>—</Text>
      ) : (
        tiles.map((tile) => (
          <View key={tile.pos} style={styles.reviewTile}>
            <View
              style={[
                styles.band,
                { backgroundColor: tile.kind === 'property' ? GROUPS[tile.group]?.color : Brand.muted },
              ]}
            />
            <Text style={styles.tileName}>{labelOf(tile)[locale]}</Text>
          </View>
        ))
      )}
    </View>
  );
}

// --- helpers -----------------------------------------------------------------

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.centeredText}>{children}</Text>
    </View>
  );
}

/** Owned, house-free tiles a player may put into a trade (mortgaged is allowed). */
function tradableTiles(state: GameState, owner: PlayerId): OwnableTile[] {
  return BOARD.filter(
    (tile): tile is OwnableTile =>
      isOwnable(tile) &&
      state.holdings[tile.pos]?.owner === owner &&
      (state.holdings[tile.pos]?.houses ?? 0) === 0,
  ).sort((a, b) => a.pos - b.pos);
}

function toggle(set: Set<number>, pos: number): Set<number> {
  const next = new Set(set);
  if (next.has(pos)) next.delete(pos);
  else next.add(pos);
  return next;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 },
  heading: { fontFamily: Fonts.bodyBlack, fontSize: 15, color: Brand.ink },
  tabs: { gap: 8, paddingVertical: 2 },
  tab: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Brand.muted,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  tabActive: { color: Brand.ink, borderColor: Brand.gold, backgroundColor: Brand.paper },
  body: { gap: 14, paddingBottom: 8 },
  column: {
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 12,
    gap: 8,
  },
  colTitle: { fontFamily: Fonts.bodyBlack, fontSize: 13, color: Brand.ink },
  colEmpty: { fontFamily: Fonts.body, fontSize: 12, color: Brand.muted },
  cashRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cashLabel: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Brand.muted },
  cashInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Brand.ink,
    backgroundColor: Brand.sand,
    fontVariant: ['tabular-nums'],
  },
  cashMax: { fontFamily: Fonts.body, fontSize: 11, color: Brand.muted, fontVariant: ['tabular-nums'] },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: Brand.sand,
  },
  tileSelected: { borderColor: Brand.gold, backgroundColor: Brand.paper },
  band: { width: 6, alignSelf: 'stretch' },
  tileName: { fontFamily: Fonts.bodySemi, flex: 1, fontSize: 13, color: Brand.ink, paddingVertical: 9, paddingHorizontal: 8 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Brand.line,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: Brand.gold, borderColor: Brand.gold },
  checkMark: { fontFamily: Fonts.bodyBlack, color: Brand.paper, fontSize: 13 },
  mortBadge: { fontFamily: Fonts.bodyBold, fontSize: 9, color: Brand.red, marginRight: 6 },
  error: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Brand.red, textAlign: 'center' },
  reviewActions: { flexDirection: 'row', gap: 10 },
  reviewCash: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Brand.ink, fontVariant: ['tabular-nums'] },
  reviewTile: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Brand.line, borderRadius: 10, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: Brand.sand },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  centeredText: { fontFamily: Fonts.body, fontSize: 14, color: Brand.muted, textAlign: 'center' },
});
