import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { type Action } from '@monopoly/engine';
import { TradeSheet } from '@/features/game/trade/trade-sheet';
import { useOnlineDispatch, useRoom } from '@/services/convex';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

/**
 * Online trade. Reuses the pass-and-play `TradeSheet`: the current player
 * proposes; once `pendingTrade` is set, the recipient (on their own device)
 * sees the review stage and accepts/declines. The server validates seat
 * ownership for both `PROPOSE_TRADE` and `RESPOND_TRADE`.
 */
export default function OnlineTradeRoute() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const roomCode = (code ?? '').toUpperCase();
  const { room, loading } = useRoom(roomCode || null);
  const sendOnline = useOnlineDispatch(roomCode);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('loading')}</Text>
      </View>
    );
  }
  if (!room || !room.state) return <Redirect href="/online" />;

  const dispatch = (action: Action) => {
    setError(null);
    void sendOnline(action).catch((e: unknown) => setError(serverMessage(e)));
  };

  return (
    <View style={styles.root}>
      <TradeSheet state={room.state} dispatch={dispatch} error={error} onDone={() => router.back()} />
      <View style={styles.footer}>
        <Button label={t('close')} variant="outline" onPress={() => router.back()} />
      </View>
    </View>
  );
}

function serverMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e && typeof (e as { data: unknown }).data === 'string') {
    return (e as { data: string }).data;
  }
  return e instanceof Error ? e.message : String(e);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.sand },
  footer: { padding: 16, paddingTop: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.sand },
  muted: { fontFamily: Fonts.body, fontSize: 15, color: Brand.muted },
});
