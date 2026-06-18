/**
 * Player token overlay. Renders one piece per player absolutely over the board
 * and animates it along the ring (Reanimated): a normal dice move steps through
 * each intervening tile center, while a jump (go-to-jail, advance-to card) slides
 * straight to the target. The layer is `pointerEvents="none"` so tile taps still
 * reach the board beneath.
 */
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BOARD_SIZE, type GameState } from '@monopoly/engine';
import { Brand } from '@/shared/ui/brand';

import { tileCenterFraction } from './geometry';

const DOT = 14;
const INSET = 4; // board border (2) + padding (2): grid sits inside this
const STEP_MS = 90; // per-tile hop while walking the ring
const JUMP_MS = 280; // straight slide for teleports

/** Small per-seat nudges so tokens sharing a tile don't fully overlap. */
const SEAT_OFFSETS: readonly (readonly [number, number])[] = [
  [-5, -5],
  [5, -5],
  [-5, 5],
  [5, 5],
  [0, -7],
  [0, 7],
];

interface TokensProps {
  players: GameState['players'];
  /** Measured board width in px (square). */
  size: number;
}

export function Tokens({ players, size }: TokensProps) {
  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {players.map((p, i) => (
        <PlayerToken key={p.id} player={p} size={size} seat={i} />
      ))}
    </Animated.View>
  );
}

function PlayerToken({
  player,
  size,
  seat,
}: {
  player: GameState['players'][number];
  size: number;
  seat: number;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const prevPos = useRef<number | undefined>(undefined);

  useEffect(() => {
    const span = size - 2 * INSET;
    const [ox, oy] = SEAT_OFFSETS[seat % SEAT_OFFSETS.length];
    const pxOf = (pos: number) => {
      const { fx, fy } = tileCenterFraction(pos);
      return { px: INSET + fx * span + ox, py: INSET + fy * span + oy };
    };

    const target = pxOf(player.position);
    const fromPos = prevPos.current;

    // mount or a size-only change (same tile): snap, no animation
    if (fromPos === undefined || fromPos === player.position) {
      x.value = target.px;
      y.value = target.py;
      prevPos.current = player.position;
      return;
    }

    prevPos.current = player.position;
    const forward = (player.position - fromPos + BOARD_SIZE) % BOARD_SIZE;

    if (forward >= 1 && forward <= 12) {
      // walk the ring, one tile center at a time
      const xs = [];
      const ys = [];
      for (let s = 1; s <= forward; s++) {
        const stop = pxOf((fromPos + s) % BOARD_SIZE);
        const cfg = { duration: STEP_MS, easing: Easing.inOut(Easing.quad) };
        xs.push(withTiming(stop.px, cfg));
        ys.push(withTiming(stop.py, cfg));
      }
      x.value = withSequence(...xs);
      y.value = withSequence(...ys);
    } else {
      // jump (jail, advance-to): slide straight there
      x.value = withTiming(target.px, { duration: JUMP_MS });
      y.value = withTiming(target.py, { duration: JUMP_MS });
    }
  }, [player.position, size, seat, x, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - DOT / 2 }, { translateY: y.value - DOT / 2 }],
  }));

  if (player.bankrupt) return null;

  return (
    <Animated.View
      style={[styles.token, { backgroundColor: player.token }, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  token: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: Brand.paper,
    boxShadow: '0 2px 4px rgba(33,28,22,0.4)',
  },
});
