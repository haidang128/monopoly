/**
 * Fires SFX cues for the online game. Pass-and-play emits cues from its store's
 * action hook, but online state arrives as authoritative `GameState` snapshots
 * over a Convex subscription with no action stream — so we derive cues by diffing
 * the previous snapshot against the next. The first snapshot (initial subscribe /
 * rejoin) is skipped so we don't blast a backlog of cues on join.
 *
 * Cues are value-compared, not reference-compared: every Convex update yields a
 * fresh object, so identity checks would fire every tick.
 */
import { useEffect, useRef } from 'react';

import type { GameState } from '@monopoly/engine';
import { sound } from '@/services/sound';

export function useOnlineSounds(state: GameState): void {
  const prev = useRef<GameState | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    if (!p) return; // skip the first snapshot

    // A new roll: dice changed value, or a doubles re-roll bumped the counter.
    const d = state.dice;
    if (
      d &&
      (!p.dice || d[0] !== p.dice[0] || d[1] !== p.dice[1] || state.doublesCount !== p.doublesCount)
    ) {
      sound.roll();
    }

    // A tile became owned (purchase or auction win).
    if (Object.keys(state.holdings).length > Object.keys(p.holdings).length) sound.buy();

    // A Cơ Hội / Khí Vận card was drawn.
    if ((state.lastCard?.draw ?? 0) > (p.lastCard?.draw ?? 0)) sound.card();

    // Game over fanfare.
    if (state.phase === 'gameOver' && p.phase !== 'gameOver') sound.win();
  }, [state]);
}
