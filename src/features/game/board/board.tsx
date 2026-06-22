/**
 * The hi-fi 40-tile board, recreating the "Board & Cards" design: a dark wood
 * frame around an 11×11 grid (1.5fr corners, nine 1fr edge tiles, a 9×9 center),
 * with the gap color showing through as grid lines. The center carries the two
 * dashed event-deck markers and the rotated "Cờ Tỷ Phú Việt" logo over a faint
 * Vietnam-map panel.
 *
 * It receives the authoritative `players` + `holdings` slices and derives the
 * per-tile presentation once, then renders pure `TileView`s. Tapping a tile
 * bubbles its position up for the title-deed inspector.
 */
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BOARD, type GameState, type Locale } from '@monopoly/engine';
import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

import { EDGES } from './geometry';
import { TileView } from './tile';
import { Tokens } from './tokens';

interface BoardProps {
  players: GameState['players'];
  holdings: GameState['holdings'];
  locale: Locale;
  onTilePress?: (pos: number) => void;
}

export function Board({ players, holdings, locale, onTilePress }: BoardProps) {
  const [size, setSize] = useState(0);

  const ownerColorByPos = useMemo(() => {
    const colorOf = new Map(players.map((p) => [p.id, p.token]));
    const owners: Record<number, string | undefined> = {};
    for (const [pos, h] of Object.entries(holdings)) {
      owners[Number(pos)] = colorOf.get(h.owner);
    }
    return owners;
  }, [players, holdings]);

  const renderTile = (pos: number, corner = false) => {
    const holding = holdings[pos];
    const cell = (
      <TileView
        tile={BOARD[pos]}
        locale={locale}
        ownerColor={ownerColorByPos[pos]}
        houses={holding?.houses}
        mortgaged={holding?.mortgaged}
        onPress={onTilePress ? () => onTilePress(pos) : undefined}
      />
    );
    return (
      <View key={pos} style={corner ? styles.corner : styles.edgeSlot}>
        {cell}
      </View>
    );
  };

  const chance = locale === 'en' ? 'CHANCE' : 'CƠ HỘI';
  const fate = locale === 'en' ? 'FATE' : 'KHÍ VẬN';

  return (
    <View style={styles.frame}>
      <View style={styles.board} onLayout={(e) => setSize(Math.round(e.nativeEvent.layout.width))}>
        {/* top row: free-parking corner · top edge L→R · go-to-jail corner */}
        <View style={styles.rowEdge}>
          {renderTile(20, true)}
          {EDGES.top.map((pos) => renderTile(pos))}
          {renderTile(30, true)}
        </View>

        {/* middle band: left column · center felt · right column */}
        <View style={styles.middle}>
          <View style={styles.colEdge}>{EDGES.left.map((pos) => renderTile(pos))}</View>

          <View style={styles.center}>
            {/* board-center cover art from the new design (assets/art/board-center.png) */}
            <Image
              style={StyleSheet.absoluteFill}
              source={require('@/assets/art/board-center.png')}
              contentFit="cover"
            />

            {/* Cơ Hội deck marker (top-left) */}
            <View style={[styles.deck, styles.deckChance]}>
              <View style={styles.deckInner}>
                <Text style={[styles.deckLabel, { color: '#9a6a2a' }]}>{chance}</Text>
                <Text style={[styles.deckGlyph, { color: ACCENT }]}>?</Text>
              </View>
            </View>

            {/* Khí Vận deck marker (bottom-right) */}
            <View style={[styles.deck, styles.deckFate]}>
              <View style={styles.deckInner}>
                <Text style={[styles.deckLabel, { color: TEAL }]}>{fate}</Text>
                <View style={styles.deckDiamond} />
              </View>
            </View>

            <View style={styles.logo}>
              <Text style={styles.logoTitle}>CỜ TỶ PHÚ</Text>
              <Text style={styles.logoSub}>VIỆT NAM</Text>
            </View>
          </View>

          <View style={styles.colEdge}>{EDGES.right.map((pos) => renderTile(pos))}</View>
        </View>

        {/* bottom row: jail corner · bottom edge L→R · GO corner */}
        <View style={styles.rowEdge}>
          {renderTile(10, true)}
          {EDGES.bottom.map((pos) => renderTile(pos))}
          {renderTile(0, true)}
        </View>

        {/* animated player pieces, layered above the tiles */}
        {size > 0 && <Tokens players={players} size={size} />}
      </View>
    </View>
  );
}

const ACCENT = Brand.gold;
const TEAL = '#2E6E5E';

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#1E1913',
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#0E0B07',
    padding: 6,
    boxShadow: '0 18px 44px rgba(33,28,22,0.34)',
  },
  board: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'column',
    gap: 1.5,
    backgroundColor: '#C9BDA4', // shows through the gaps as grid lines
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  rowEdge: { flex: 1.5, flexDirection: 'row', gap: 1.5 },
  middle: { flex: 9, flexDirection: 'row', gap: 1.5 },
  colEdge: { flex: 1.5, flexDirection: 'column', gap: 1.5 },
  corner: { flex: 1.5 },
  edgeSlot: { flex: 1 },
  center: {
    flex: 9,
    backgroundColor: '#EFE3C6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  deck: {
    position: 'absolute',
    width: '23%',
    height: '23%',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    borderCurve: 'continuous',
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(252,248,240,0.55)',
  },
  deckChance: { top: '11%', left: '9%', borderColor: ACCENT },
  deckFate: { bottom: '11%', right: '9%', borderColor: TEAL },
  deckInner: { transform: [{ rotate: '45deg' }], alignItems: 'center', gap: 3 },
  deckLabel: { fontFamily: Fonts.display, fontSize: 8, letterSpacing: 0.4 },
  deckGlyph: { fontFamily: Fonts.displayBlack, fontSize: 18, lineHeight: 18 },
  deckDiamond: { width: 11, height: 11, backgroundColor: TEAL, transform: [{ rotate: '45deg' }] },
  logo: {
    transform: [{ rotate: '-32deg' }],
    backgroundColor: Brand.red,
    borderWidth: 2.5,
    borderColor: '#1E1913',
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
    boxShadow: '0 8px 18px rgba(33,28,22,0.38)',
  },
  logoTitle: {
    fontFamily: Fonts.displayBlack,
    fontSize: 19,
    lineHeight: 19,
    color: Brand.paper,
    letterSpacing: 0.4,
  },
  logoSub: {
    fontFamily: Fonts.bodyBlack,
    fontSize: 8,
    letterSpacing: 3,
    color: '#F1D9A6',
    marginTop: 3,
    paddingLeft: 3,
  },
});
