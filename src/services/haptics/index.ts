/**
 * Haptics seam. Centralizes device feedback behind semantic verbs so screens
 * never import `expo-haptics` directly (mirrors the `services/analytics` facade).
 *
 * Native-only: it no-ops on web and anywhere haptics aren't supported, and
 * swallows rejections so a missing taptic engine can never break a tap handler.
 */
import * as Haptics from 'expo-haptics';

const enabled = process.env.EXPO_OS === 'ios' || process.env.EXPO_OS === 'android';

const run = (fn: () => Promise<unknown>) => {
  if (enabled) fn().catch(() => {});
};

export const haptics = {
  /** Light tick for selections / minor taps (buy, toggle). */
  tap: () => run(() => Haptics.selectionAsync()),
  /** Heavy thud for the dice landing. */
  roll: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** Positive outcome (doubles, purchase complete). */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Caution (debt owed, sent to jail). */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Failure (bankruptcy). */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
