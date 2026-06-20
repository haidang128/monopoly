/**
 * Portfolio sheet — a player's holdings, cash and net worth, and (when a
 * `dispatch` is supplied and the viewed player is the current player) the
 * build/manage controls: buy/sell houses and mortgage/unmortgage, gated by the
 * engine's legality helpers and per-action phase rules.
 *
 * Read-only by default (omit `dispatch`) so the trade flow and any spectator
 * view can reuse it. It holds no game state of its own — the route wrapper
 * (`app/game/[roomId]/portfolio.tsx`) presents it as a form sheet and feeds it
 * authoritative `GameState` + the dispatch seam.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BOARD,
  GROUPS,
  type Action,
  type GameState,
  type OwnableTile,
  type PlayerId,
  canBuild,
  canSellHouse,
  isOwnable,
  labelOf,
  maxRaisable,
  mortgageOf,
  netWorth,
  ownsFullGroup,
  rentFor,
} from '@monopoly/engine';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

interface PortfolioSheetProps {
  state: GameState;
  /** Which player's holdings to show first; defaults to the current player. */
  initialPlayer?: PlayerId;
  /** Supplying this enables build/manage controls for the current player. */
  dispatch?: (action: Action) => void;
}

export function PortfolioSheet({ state, initialPlayer, dispatch }: PortfolioSheetProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';

  const fallback = state.order[state.current] ?? state.players[0]?.id ?? '';
  const [viewed, setViewed] = useState<PlayerId>(initialPlayer ?? fallback);
  const player = state.players.find((p) => p.id === viewed) ?? state.players[0];
  if (!player) return null;

  // Manage only your own holdings, and only when the engine would accept an
  // asset action (the four management phases below).
  const isCurrent = player.id === state.order[state.current];
  const canManage =
    !!dispatch &&
    isCurrent &&
    (state.phase === 'preRoll' ||
      state.phase === 'turnEnd' ||
      state.phase === 'mustResolveDebt' ||
      state.phase === 'jailOptions');

  const owned = ownedTiles(state, player.id);

  return (
    <View style={styles.root}>
      {/* player switcher: inspect any seat (also used by trade later) */}
      {state.players.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {state.players.map((p) => {
            const active = p.id === player.id;
            return (
              <Text
                key={p.id}
                onPress={() => setViewed(p.id)}
                style={[styles.tab, active && styles.tabActive, p.bankrupt && styles.tabOut]}
              >
                <Text style={[styles.tabDot, { color: p.token }]}>● </Text>
                {p.name}
              </Text>
            );
          })}
        </ScrollView>
      )}

      {/* money summary */}
      <View style={styles.summary}>
        <Summary label={t('cash')} value={formatDong(player.cash)} accent />
        <Summary label={t('netWorth')} value={formatDong(netWorth(state, player.id))} />
        <Summary label={t('raisable')} value={formatDong(maxRaisable(state, player.id))} />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {owned.length === 0 ? (
          <Text style={styles.empty}>{t('noHoldings')}</Text>
        ) : (
          owned.map((tile) => (
            <HoldingRow
              key={tile.pos}
              state={state}
              tile={tile}
              owner={player.id}
              locale={locale}
              t={t}
              dispatch={canManage ? dispatch : undefined}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, accent && styles.summaryAccent]}>{value}</Text>
    </View>
  );
}

function HoldingRow({
  state,
  tile,
  owner,
  locale,
  t,
  dispatch,
}: {
  state: GameState;
  tile: OwnableTile;
  owner: PlayerId;
  locale: 'vi' | 'en';
  t: (key: string) => string;
  /** When set, the row shows build/manage controls (current player only). */
  dispatch?: (action: Action) => void;
}) {
  const holding = state.holdings[tile.pos]!;
  const color = tile.kind === 'property' ? GROUPS[tile.group]?.color : Brand.muted;
  const fullSet = tile.kind === 'property' && ownsFullGroup(state, owner, tile.group);

  return (
    <View style={[styles.row, holding.mortgaged && styles.rowMortgaged]}>
      <View style={[styles.band, { backgroundColor: color }]} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <View style={styles.rowBody}>
            <Text style={styles.rowName} numberOfLines={1}>
              {labelOf(tile)[locale]}
            </Text>
            <Text style={styles.rowMeta}>
              {t('rent')} {rentLabel(state, tile, t)} · {t('mortgaged')} {formatDong(mortgageOf(tile))}
            </Text>
          </View>
          <View style={styles.rowRight}>
            {holding.mortgaged ? (
              <Text style={styles.mortBadge}>{t('mortgaged')}</Text>
            ) : (
              <BuildingPips houses={holding.houses} />
            )}
            {fullSet && !holding.mortgaged && <Text style={styles.setBadge}>{t('monopoly')}</Text>}
          </View>
        </View>
        {dispatch && (
          <ManageActions state={state} tile={tile} owner={owner} dispatch={dispatch} t={t} />
        )}
      </View>
    </View>
  );
}

/**
 * Per-tile asset actions. Each chip is shown only when the action is relevant
 * for this tile and enabled only when the engine would accept it right now —
 * mirroring `BUILD` / `SELL_HOUSE` / `MORTGAGE` / `UNMORTGAGE` legality + phase.
 */
function ManageActions({
  state,
  tile,
  owner,
  dispatch,
  t,
}: {
  state: GameState;
  tile: OwnableTile;
  owner: PlayerId;
  dispatch: (action: Action) => void;
  t: (key: string) => string;
}) {
  const holding = state.holdings[tile.pos]!;
  const cash = state.players.find((p) => p.id === owner)?.cash ?? 0;
  const phase = state.phase;
  // Buying houses / lifting mortgages is only legal between turns; selling and
  // mortgaging is also allowed while raising cash (debt / jail).
  const buildPhase = phase === 'preRoll' || phase === 'turnEnd';
  const raisePhase = buildPhase || phase === 'mustResolveDebt' || phase === 'jailOptions';

  const houseCost = tile.kind === 'property' ? GROUPS[tile.group]!.houseCost : 0;
  const sellValue = Math.floor(houseCost / 2);
  const liftCost = Math.ceil(mortgageOf(tile) * 1.1);

  const chips: React.ReactNode[] = [];

  if (tile.kind === 'property') {
    if (holding.houses < 5) {
      chips.push(
        <ManageChip
          key="build"
          label={`${t('build')} ${formatDong(houseCost)}`}
          disabled={!buildPhase || !canBuild(state, owner, tile.pos) || cash < houseCost}
          onPress={() => dispatch({ type: 'BUILD', player: owner, pos: tile.pos })}
        />,
      );
    }
    if (holding.houses > 0) {
      chips.push(
        <ManageChip
          key="sell"
          label={`${t('sellHouse')} +${formatDong(sellValue)}`}
          disabled={!raisePhase || !canSellHouse(state, owner, tile.pos)}
          onPress={() => dispatch({ type: 'SELL_HOUSE', player: owner, pos: tile.pos })}
        />,
      );
    }
  }

  if (holding.mortgaged) {
    chips.push(
      <ManageChip
        key="lift"
        label={`${t('unmortgage')} ${formatDong(liftCost)}`}
        disabled={!buildPhase || cash < liftCost}
        onPress={() => dispatch({ type: 'UNMORTGAGE', player: owner, pos: tile.pos })}
      />,
    );
  } else {
    chips.push(
      <ManageChip
        key="mort"
        label={`${t('mortgage')} +${formatDong(mortgageOf(tile))}`}
        disabled={!raisePhase || holding.houses > 0}
        onPress={() => dispatch({ type: 'MORTGAGE', player: owner, pos: tile.pos })}
      />,
    );
  }

  return <View style={styles.actions}>{chips}</View>;
}

function ManageChip({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
        disabled && styles.chipDisabled,
      ]}
    >
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

/** Houses 1–4 = green pips; 5 = a single gold hotel marker. */
function BuildingPips({ houses }: { houses: number }) {
  if (houses === 0) return null;
  if (houses >= 5) return <View style={styles.hotel} />;
  return (
    <View style={styles.pips}>
      {Array.from({ length: houses }).map((_, i) => (
        <View key={i} style={styles.house} />
      ))}
    </View>
  );
}

/** Owned ownable tiles, ordered by color group then stations/utilities. */
function ownedTiles(state: GameState, owner: PlayerId): OwnableTile[] {
  const mine = BOARD.filter(
    (tile): tile is OwnableTile => isOwnable(tile) && state.holdings[tile.pos]?.owner === owner,
  );
  const rank = (tile: OwnableTile): number => {
    if (tile.kind === 'station') return 100;
    if (tile.kind === 'utility') return 200;
    return Object.keys(GROUPS).indexOf(tile.group);
  };
  return mine.sort((a, b) => rank(a) - rank(b) || a.pos - b.pos);
}

/** Human-readable rent. Utilities scale with the dice, so show the multiplier. */
function rentLabel(state: GameState, tile: OwnableTile, t: (key: string) => string): string {
  if (tile.kind === 'utility') {
    const both = tile.multipliers[1];
    const one = tile.multipliers[0];
    return `×${one}/${both} ${t('perDice')}`;
  }
  return formatDong(rentFor(state, tile.pos, 0));
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 14 },
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
  tabOut: { opacity: 0.45, textDecorationLine: 'line-through' },
  tabDot: { fontSize: 13 },
  summary: { flexDirection: 'row', gap: 10 },
  summaryCell: {
    flex: 1,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 2,
    alignItems: 'center',
  },
  summaryLabel: { fontFamily: Fonts.monoMedium, fontSize: 11, color: Brand.muted },
  summaryValue: {
    fontFamily: Fonts.bodyBlack,
    fontSize: 14,
    color: Brand.ink,
    fontVariant: ['tabular-nums'],
  },
  summaryAccent: { color: Brand.red },
  list: { flex: 1 },
  listContent: { gap: 8, paddingBottom: 8 },
  empty: { fontFamily: Fonts.body, fontSize: 14, color: Brand.muted, textAlign: 'center', paddingVertical: 32 },
  row: {
    flexDirection: 'row',
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  rowMortgaged: { opacity: 0.6 },
  band: { width: 8, alignSelf: 'stretch' },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 2 },
  rowName: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Brand.ink },
  rowMeta: { fontFamily: Fonts.body, fontSize: 11, color: Brand.muted },
  rowRight: { paddingHorizontal: 10, alignItems: 'flex-end', gap: 4 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: Brand.gold,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: Brand.paper,
  },
  chipPressed: { opacity: 0.7 },
  chipDisabled: { opacity: 0.35, borderColor: Brand.line },
  chipLabel: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Brand.ink, fontVariant: ['tabular-nums'] },
  pips: { flexDirection: 'row', gap: 3 },
  house: { width: 8, height: 8, borderRadius: 2, backgroundColor: Brand.green },
  hotel: { width: 14, height: 10, borderRadius: 2, backgroundColor: Brand.gold },
  mortBadge: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Brand.red },
  setBadge: {
    fontFamily: Fonts.monoMedium,
    fontSize: 9,
    color: Brand.gold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
