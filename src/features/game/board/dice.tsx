/**
 * Animated dice. Given the engine's `[a, b]` roll, it renders two pip faces and
 * plays a quick tumble-and-settle (Reanimated) plus a haptic thud whenever a new
 * roll lands — doubles add a success notification.
 *
 * It animates only on a genuine in-session roll: a mid-game resume (dice already
 * present at mount) settles silently, and a turn ending (dice → null) plays
 * nothing.
 */
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptics } from '@/services/haptics';
import { Brand } from '@/shared/ui/brand';

/** Pip coordinates on a 3×3 grid (row, col) for each die face. */
const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function Die({ value, tilt }: { value: number; tilt: number }) {
  const lit = PIPS[value] ?? [];
  return (
    <View style={[styles.die, { transform: [{ rotate: `${tilt}deg` }] }]}>
      {[0, 1, 2].map((r) => (
        <View key={r} style={styles.pipRow}>
          {[0, 1, 2].map((c) => (
            <View key={c} style={styles.pipCell}>
              {lit.some(([pr, pc]) => pr === r && pc === c) && <View style={styles.pip} />}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function Dice({ values }: { values: readonly [number, number] | null }) {
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  // undefined = not yet observed (mount); null = saw the pre-roll (no dice)
  const prev = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const key = values ? `${values[0]}-${values[1]}` : null;
    const firstObservation = prev.current === undefined;
    const changed = key !== prev.current;
    prev.current = key;

    // animate/buzz only for a real new roll seen within this mounted session
    if (!values || firstObservation || !changed) return;

    rotate.value = withSequence(
      withTiming(-16, { duration: 80 }),
      withTiming(16, { duration: 90 }),
      withTiming(0, { duration: 130, easing: Easing.out(Easing.quad) }),
    );
    scale.value = withSequence(
      withTiming(1.18, { duration: 110 }),
      withSpring(1, { damping: 6, stiffness: 170 }),
    );
    haptics.roll();
    if (values[0] === values[1]) haptics.success();
  }, [values, rotate, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  if (!values) return null;

  return (
    <Animated.View style={[styles.tray, animatedStyle]}>
      <Die value={values[0]} tilt={-7} />
      <Die value={values[1]} tilt={5} />
    </Animated.View>
  );
}

const DIE = 40;

const styles = StyleSheet.create({
  tray: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  die: {
    width: DIE,
    height: DIE,
    borderRadius: 9,
    borderCurve: 'continuous',
    backgroundColor: Brand.paper,
    padding: 5,
    boxShadow: '0 6px 12px rgba(33,28,22,0.28)',
  },
  pipRow: { flex: 1, flexDirection: 'row' },
  pipCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pip: { width: 7, height: 7, borderRadius: 4, backgroundColor: Brand.ink },
});
