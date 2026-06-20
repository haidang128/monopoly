/**
 * Title-deed card — the tap-to-inspect detail, recreating the design's title
 * deeds: a group-colored header, the full rent schedule (base, full-set ×2,
 * 1–4 houses, hotel), per-house + mortgage boxes, and a dark price bar. Stations
 * and utilities get their own reduced schedules; non-ownable tiles show a slim
 * info card.
 */
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BOARD,
  GROUPS,
  type GameState,
  type Locale,
  type Tile,
  isOwnable,
  labelOf,
  mortgageOf,
  priceOf,
} from '@monopoly/engine';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

interface Row {
  label: string;
  value: string;
  highlight?: boolean;
}

export function TileDeed({
  state,
  pos,
  locale,
  onClose,
}: {
  state: GameState;
  pos: number;
  locale: Locale;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const tr = (key: string, options?: Record<string, unknown>): string => t(key, options) as string;
  const tile = BOARD[pos] ?? null;
  if (!tile) return null;

  const ownerId = state.holdings[pos]?.owner;
  const owner = ownerId ? state.players.find((p) => p.id === ownerId) : null;

  const headerColor =
    tile.kind === 'property' ? GROUPS[tile.group]?.color ?? Brand.ink : Brand.ink;
  const groupLabel =
    tile.kind === 'property'
      ? GROUPS[tile.group]?.name[locale]
      : tile.kind === 'station'
        ? tr('station')
        : tile.kind === 'utility'
          ? tr('utility')
          : null;

  return (
    <View style={styles.card}>
      <View style={[styles.header, { backgroundColor: headerColor }]}>
        {groupLabel && <Text style={styles.group}>{groupLabel.toUpperCase()}</Text>}
        <Text style={styles.title}>{labelOf(tile)[locale]}</Text>
        <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityRole="button">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {owner && (
          <Text style={styles.owned}>{tr('ownedBy', { name: owner.name })}</Text>
        )}

        {rowsFor(tile, tr).map((r, i) => (
          <View key={i} style={[styles.row, r.highlight && styles.rowHi]}>
            <Text style={[styles.rowLabel, r.highlight && styles.rowLabelHi]}>{r.label}</Text>
            <Text style={styles.rowVal}>{r.value}</Text>
          </View>
        ))}

        {tile.kind === 'property' && (
          <View style={styles.boxes}>
            <Box label={tr('perHouseLabel')} value={formatDong(GROUPS[tile.group]!.houseCost)} />
            <Box label={tr('mortgageValue')} value={formatDong(mortgageOf(tile))} />
          </View>
        )}

        {isOwnable(tile) && (
          <View style={styles.priceBar}>
            <Text style={styles.priceLabel}>{tr('deedPrice')}</Text>
            <Text style={styles.priceVal}>{formatDong(priceOf(tile))}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.boxVal}>{value}</Text>
    </View>
  );
}

function rowsFor(tile: Tile, t: (k: string, o?: Record<string, unknown>) => string): Row[] {
  if (tile.kind === 'property') {
    const g = GROUPS[tile.group]!;
    return [
      { label: t('rent'), value: formatDong(g.rents[0]) },
      { label: t('fullGroup'), value: formatDong(g.rents[1]), highlight: true },
      { label: t('houseRent', { n: 1 }), value: formatDong(g.rents[2]) },
      { label: t('houseRent', { n: 2 }), value: formatDong(g.rents[3]) },
      { label: t('houseRent', { n: 3 }), value: formatDong(g.rents[4]) },
      { label: t('houseRent', { n: 4 }), value: formatDong(g.rents[5]) },
      { label: t('hotelRent'), value: formatDong(g.rents[6]) },
    ];
  }
  if (tile.kind === 'station') {
    return tile.rents.map((r, i) => ({
      label: t('stationRent', { n: i + 1 }),
      value: formatDong(r),
    }));
  }
  if (tile.kind === 'utility') {
    return [
      { label: t('utilOne'), value: t('diceMult', { m: tile.multipliers[0] }) },
      { label: t('utilBoth'), value: t('diceMult', { m: tile.multipliers[1] }), highlight: true },
    ];
  }
  if (tile.kind === 'tax') {
    return [{ label: t('amountDue'), value: formatDong(tile.amount) }];
  }
  return [];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FCF8F0',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E4DAC8',
    overflow: 'hidden',
    boxShadow: '0 12px 28px rgba(33,28,22,0.18)',
  },
  header: { paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  group: {
    fontFamily: Fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.85)',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: '#fff',
    marginTop: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  close: { position: 'absolute', top: 8, right: 10 },
  closeText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '700' },
  body: { padding: 14, gap: 1 },
  owned: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Brand.muted, marginBottom: 6, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8D7',
  },
  rowHi: { backgroundColor: '#FBF6EC', marginHorizontal: -14, paddingHorizontal: 14 },
  rowLabel: { fontFamily: Fonts.bodySemi, fontSize: 12, color: '#5C5446' },
  rowLabelHi: { color: '#9a6a2a' },
  rowVal: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Brand.ink, fontVariant: ['tabular-nums'] },
  boxes: { flexDirection: 'row', gap: 8, marginTop: 10 },
  box: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F6ECD7',
    borderWidth: 1,
    borderColor: '#E6D6B0',
    borderRadius: 9,
    borderCurve: 'continuous',
    paddingVertical: 7,
  },
  boxLabel: { fontFamily: Fonts.mono, fontSize: 8, letterSpacing: 0.6, color: Brand.muted },
  boxVal: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Brand.ink, marginTop: 2 },
  priceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Brand.ink,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginTop: 10,
  },
  priceLabel: { fontFamily: Fonts.monoMedium, fontSize: 9, letterSpacing: 1, color: Brand.gold },
  priceVal: { fontFamily: Fonts.display, fontSize: 18, color: Brand.paper },
});
