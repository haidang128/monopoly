/**
 * Connection banner for online screens. Surfaces the Convex WebSocket status so
 * players know when the live state may be stale. Convex auto-reconnects and
 * re-runs subscriptions, so the game self-heals once the socket is back; the
 * turn timer keeps play moving for everyone else meanwhile.
 *
 * Mount only when a Convex client exists (see `online/_layout.tsx`) — the hook
 * requires a `ConvexProvider` in the tree.
 */
import { useConvexConnectionState } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

export function ConnectionBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();

  if (isWebSocketConnected) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <Text style={styles.text}>{hasEverConnected ? t('reconnecting') : t('connecting')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.red,
    paddingBottom: 6,
    alignItems: 'center',
    zIndex: 50,
  },
  text: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Brand.paper,
  },
});
