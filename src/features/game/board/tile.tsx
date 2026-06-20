/**
 * A single board cell, recreating the hi-fi "Board & Cards" design: a thick
 * group-color band hugging the inner edge, the full city name + price, content
 * rotated to face inward (each side reads upright to its player), a vector glyph
 * for special tiles, and house/hotel pips riding the band.
 *
 * Pure presentational: the board passes already-derived props (owner color,
 * houses) plus the active `locale`, so this never reads the store.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { GROUPS, type Locale, type Tile, isOwnable, labelOf, priceOf } from '@monopoly/engine';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

import {
  Bolt,
  Coin,
  Gem,
  GoArrow,
  Handcuffs,
  JailBars,
  ParkingP,
  Train,
  WaterDrop,
} from './board-icons';
import { contentRotation, tileSide, type Side } from './geometry';

const ACCENT = Brand.gold;

const BG: Record<Tile['kind'], string> = {
  property: '#FBF7EE',
  go: '#EFE0C4',
  jail: '#EFE0C4',
  gotojail: '#EFE0C4',
  freeparking: '#EFE0C4',
  event: '#FBF2DE', // overridden for khi below
  tax: '#F2EAD9',
  station: '#F2EAD9',
  utility: '#F2EAD9',
};

/** Flex direction + band cross-size so the band sits on the inner edge. */
function layoutFor(side: Side): {
  flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  band: { width: DimensionValue; height: DimensionValue };
} | null {
  switch (side) {
    case 'bottom':
      return { flexDirection: 'column', band: { width: '100%', height: '28%' } };
    case 'top':
      return { flexDirection: 'column-reverse', band: { width: '100%', height: '28%' } };
    case 'left':
      return { flexDirection: 'row-reverse', band: { width: '28%', height: '100%' } };
    case 'right':
      return { flexDirection: 'row', band: { width: '28%', height: '100%' } };
    default:
      return null;
  }
}

function iconFor(tile: Tile): React.ReactNode {
  switch (tile.kind) {
    case 'go':
      return <GoArrow color={ACCENT} size={11} />;
    case 'jail':
      return <JailBars color="#2A241C" size={10} />;
    case 'gotojail':
      return <Handcuffs color={Brand.red} size={9} />;
    case 'freeparking':
      return <ParkingP color={Brand.red} size={9} />;
    case 'station':
      return <Train color="#3A3228" size={11} />;
    case 'utility':
      return tile.id === 'dienLuc' ? (
        <Bolt color={ACCENT} size={13} />
      ) : (
        <WaterDrop color="#2E80C2" size={11} />
      );
    case 'tax':
      return tile.name.en.includes('Income') ? (
        <Coin color={Brand.gold} size={13} />
      ) : (
        <Gem color="#1565A8" size={11} />
      );
    default:
      return null;
  }
}

export interface TileViewProps {
  tile: Tile;
  locale: Locale;
  /** Owner's token color when the tile is owned (else undefined). */
  ownerColor?: string;
  /** Buildings on the tile: 1..4 houses, 5 = hotel. */
  houses?: number;
  mortgaged?: boolean;
  onPress?: () => void;
}

function TileViewBase({ tile, locale, ownerColor, houses = 0, mortgaged, onPress }: TileViewProps) {
  const side = tileSide(tile.pos);
  const rot = contentRotation(tile.pos);
  const isProperty = tile.kind === 'property';
  const layout = isProperty ? layoutFor(side) : null;
  const groupColor = isProperty ? GROUPS[tile.group]?.color : undefined;
  const bg = tile.kind === 'event' && tile.deck === 'khi' ? '#E7F0EC' : BG[tile.kind];

  const deck = tile.kind === 'event' ? tile.deck : null;
  const eventAccent = deck === 'co' ? ACCENT : deck === 'khi' ? Brand.green : undefined;
  const sub =
    isOwnable(tile) ? formatDong(priceOf(tile)) : tile.kind === 'tax' ? formatDong(tile.amount) : null;

  const content = (
    <View style={[styles.contentInner, { transform: [{ rotate: `${rot}deg` }] }]}>
      {deck ? (
        <Text style={[styles.eventSymbol, { color: eventAccent }]}>
          {deck === 'co' ? '?' : '◆'}
        </Text>
      ) : (
        <View style={styles.icon}>{iconFor(tile)}</View>
      )}
      <Text
        style={[styles.name, !!deck && { color: eventAccent, letterSpacing: 0.2 }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {labelOf(tile)[locale]}
      </Text>
      {sub && (
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        { backgroundColor: bg },
        layout && { flexDirection: layout.flexDirection },
        mortgaged && styles.mortgaged,
      ]}
    >
      {layout && groupColor && (
        <View style={[styles.band, layout.band, { backgroundColor: groupColor }]}>
          {houses > 0 && (
            <View style={[styles.pips, { transform: [{ rotate: `${rot}deg` }] }]}>
              {houses >= 5 ? (
                <View style={styles.hotel} />
              ) : (
                Array.from({ length: houses }).map((_, i) => <View key={i} style={styles.house} />)
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.content}>{content}</View>

      {ownerColor && <View style={[styles.owner, { backgroundColor: ownerColor }]} />}
    </Pressable>
  );
}

export const TileView = memo(TileViewBase);

const styles = StyleSheet.create({
  cell: { flex: 1, position: 'relative', overflow: 'hidden' },
  mortgaged: { opacity: 0.5 },
  band: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contentInner: { alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 1 },
  icon: { alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  eventSymbol: { fontFamily: Fonts.display, fontSize: 15, lineHeight: 15 },
  name: {
    fontFamily: Fonts.bodyBold,
    fontSize: 6.5,
    lineHeight: 7.5,
    color: '#2A241C',
    textAlign: 'center',
  },
  sub: { fontFamily: Fonts.bodyBold, fontSize: 6, color: '#8A7B61', marginTop: 0.5 },
  pips: { flexDirection: 'row', gap: 1, alignItems: 'center' },
  house: { width: 3, height: 3, borderRadius: 1, backgroundColor: '#2F8559', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.25)' },
  hotel: { width: 9, height: 3.5, borderRadius: 1, backgroundColor: Brand.red, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.25)' },
  owner: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: Brand.paper,
  },
});
