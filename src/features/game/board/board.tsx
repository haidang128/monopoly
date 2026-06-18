/**
 * The hi-fi 40-tile board. A square (`aspectRatio: 1`) flex layout that mirrors
 * the design's 11×11 CSS grid using flex weights: a 1.5fr perimeter depth, nine
 * 1fr edge tiles per side, 1.5fr corners, and a 9×9 center felt.
 *
 * It receives the authoritative `players` + `holdings` slices and derives the
 * per-tile presentation (who stands where, who owns what) once, then renders
 * pure `TileView`s. Tapping a tile bubbles its position up for the inspector.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BOARD, type GameState } from '@monopoly/engine';
import { Brand } from '@/shared/ui/brand';

import { EDGES } from './geometry';
import { TileView } from './tile';
import { Tokens } from './tokens';

interface BoardProps {
  players: GameState['players'];
  holdings: GameState['holdings'];
  onTilePress?: (pos: number) => void;
}

export function Board({ players, holdings, onTilePress }: BoardProps) {
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
        ownerColor={ownerColorByPos[pos]}
        houses={holding?.houses}
        mortgaged={holding?.mortgaged}
        onPress={onTilePress ? () => onTilePress(pos) : undefined}
      />
    );
    return corner ? (
      <View key={pos} style={styles.corner}>
        {cell}
      </View>
    ) : (
      // edge tiles are flex:1 via TileView's own root; key on the wrapper-less node
      <View key={pos} style={styles.edgeSlot}>
        {cell}
      </View>
    );
  };

  return (
    <View
      style={styles.board}
      onLayout={(e) => setSize(e.nativeEvent.layout.width)}
    >
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
          <View style={[styles.diagonal, styles.diagTopLeft]}>
            <Text style={styles.diagText}>KHÍ{'\n'}VẬN</Text>
          </View>
          <View style={[styles.diagonal, styles.diagBottomRight]}>
            <Text style={styles.diagText}>CƠ{'\n'}HỘI</Text>
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
  );
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'column',
    gap: 1,
    padding: 2,
    backgroundColor: '#D8CDB6', // sand shows through the 1px gaps as grid lines
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  rowEdge: { flex: 1.5, flexDirection: 'row', gap: 1 },
  middle: { flex: 9, flexDirection: 'row', gap: 1 },
  colEdge: { flex: 1.5, flexDirection: 'column', gap: 1 },
  corner: { flex: 1.5 },
  edgeSlot: { flex: 1 },
  center: {
    flex: 9,
    backgroundColor: '#D7E8D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagonal: {
    position: 'absolute',
    width: '33%',
    height: '33%',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#95AB8E',
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagTopLeft: { top: '13%', left: '11%' },
  diagBottomRight: { bottom: '13%', right: '11%' },
  diagText: {
    transform: [{ rotate: '45deg' }],
    fontWeight: '700',
    fontSize: 7,
    lineHeight: 8,
    letterSpacing: 0.4,
    color: '#5E6E58',
    textAlign: 'center',
  },
  logo: {
    transform: [{ rotate: '-38deg' }],
    backgroundColor: Brand.red,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 6,
    borderCurve: 'continuous',
    paddingVertical: 5,
    paddingHorizontal: 13,
    alignItems: 'center',
    boxShadow: '0 4px 10px rgba(33,28,22,0.3)',
  },
  logoTitle: {
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 18,
    color: Brand.paper,
    letterSpacing: 0.4,
  },
  logoSub: {
    fontWeight: '800',
    fontSize: 7.5,
    letterSpacing: 2,
    color: '#F1D9A6',
    marginTop: 2,
  },
});
