import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { type Action } from '@monopoly/engine';
import { PortfolioSheet } from '@/features/game/portfolio/portfolio-sheet';
import { useIdentity } from '@/services/auth';
import { useOnlineDispatch, useRoom } from '@/services/convex';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

/**
 * Online portfolio + build/manage. Reuses the pass-and-play `PortfolioSheet`,
 * fed authoritative state from `useRoom` and the Convex dispatch. Manage controls
 * are enabled only when it's this device's turn (the server enforces it too).
 */
export default function OnlinePortfolioRoute() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const roomCode = (code ?? '').toUpperCase();
  const { room, loading } = useRoom(roomCode || null);
  const { userId } = useIdentity();
  const sendOnline = useOnlineDispatch(roomCode);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('loading')}</Text>
      </View>
    );
  }
  if (!room || !room.state) return <Redirect href="/online" />;

  const state = room.state;
  const myPlayerId = room.seats.find((s) => s.identityId === userId)?.playerId ?? null;
  const isMyTurn = !!myPlayerId && state.order[state.current] === myPlayerId;
  const dispatch =
    isMyTurn ? (action: Action) => void sendOnline(action).catch(() => {}) : undefined;

  return (
    <View style={styles.root}>
      <PortfolioSheet state={state} dispatch={dispatch} initialPlayer={myPlayerId ?? undefined} />
      <View style={styles.footer}>
        <Button label={t('close')} variant="outline" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.sand },
  footer: { padding: 16, paddingTop: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.sand },
  muted: { fontFamily: Fonts.body, fontSize: 15, color: Brand.muted },
});
