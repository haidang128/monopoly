/**
 * A single board cell. Pure presentational: the board passes already-derived
 * props (tokens standing here, owner color, houses) so this never reads the
 * store and re-renders only when its own tile changes.
 *
 * Visuals mirror the hi-fi design: a kind-tinted background, the group color
 * band hugging the inner edge, a compact code, owner marker + house pips, and
 * dots for any player tokens currently on the tile.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GROUPS, type Tile } from '@monopoly/engine';
import { Brand } from '@/shared/ui/brand';

import { bandEdge, tileShortCode, type Edge } from './geometry';

const BAND = 5;

const BG: Record<Tile['kind'], string> = {
  property: '#FFFFFF',
  go: '#F0D2A8',
  event: '#F2EAD9',
  tax: '#F2EAD9',
  station: '#ECE3D1',
  utility: '#ECE3D1',
  jail: '#EDE0C6',
  gotojail: '#EDE0C6',
  freeparking: '#EDE0C6',
};

export interface TileViewProps {
  tile: Tile;
  /** Owner's token color when the tile is owned (else undefined). */
  ownerColor?: string;
  /** Buildings on the tile: 1..4 houses, 5 = hotel. */
  houses?: number;
  mortgaged?: boolean;
  onPress?: () => void;
}

function bandPosition(edge: Edge) {
  switch (edge) {
    case 'top':
      return { top: 0, left: 0, right: 0, height: BAND };
    case 'bottom':
      return { bottom: 0, left: 0, right: 0, height: BAND };
    case 'left':
      return { top: 0, bottom: 0, left: 0, width: BAND };
    case 'right':
      return { top: 0, bottom: 0, right: 0, width: BAND };
  }
}

function TileViewBase({ tile, ownerColor, houses = 0, mortgaged, onPress }: TileViewProps) {
  const edge = bandEdge(tile.pos);
  const groupColor = tile.kind === 'property' ? GROUPS[tile.group]?.color : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.cell, { backgroundColor: BG[tile.kind] }, mortgaged && styles.mortgaged]}
    >
      {edge && groupColor && (
        <View style={[styles.band, bandPosition(edge), { backgroundColor: groupColor }]} />
      )}

      <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit>
        {tileShortCode(tile)}
      </Text>

      {/* owner marker (top-left corner dot) */}
      {ownerColor && <View style={[styles.owner, { backgroundColor: ownerColor }]} />}

      {/* house pips / hotel marker along the inner band */}
      {houses > 0 && (
        <View style={styles.houses}>
          {houses >= 5 ? (
            <View style={styles.hotel} />
          ) : (
            Array.from({ length: houses }).map((_, i) => <View key={i} style={styles.house} />)
          )}
        </View>
      )}

    </Pressable>
  );
}

export const TileView = memo(TileViewBase);

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mortgaged: { opacity: 0.55 },
  band: { position: 'absolute' },
  code: {
    fontSize: 7,
    fontWeight: '700',
    lineHeight: 8,
    color: '#3A3228',
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  owner: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: Brand.paper,
  },
  houses: {
    position: 'absolute',
    bottom: 1,
    flexDirection: 'row',
    gap: 1,
  },
  house: { width: 3, height: 3, borderRadius: 1, backgroundColor: Brand.green },
  hotel: { width: 9, height: 3, borderRadius: 1, backgroundColor: Brand.red },
});
