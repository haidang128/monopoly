import { type HouseRules } from '@monopoly/engine';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnlineGame } from '@/features/game/online/online-game';
import { RecapView } from '@/features/game/recap/recap-view';
import { RULE_PRESETS } from '@/features/game/rules/presets';
import { RulesPicker } from '@/features/game/rules/rules-picker';
import { useIdentity } from '@/services/auth';
import { useOnlineActions, useRoom } from '@/services/convex';
import { clearLastRoom } from '@/services/storage';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

/** Room screen: a waiting lobby that flips into the live game once the host starts. */
export default function RoomScreen() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const roomCode = (code ?? '').toUpperCase();
  const { room, loading } = useRoom(roomCode || null);
  const { userId } = useIdentity();
  const { startGame, leaveRoom } = useOnlineActions();
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<HouseRules>(() => ({ ...RULE_PRESETS.classic.rules }));

  const goHome = () => {
    clearLastRoom();
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>{t('loading')}</Text>
      </SafeAreaView>
    );
  }
  if (!room) {
    clearLastRoom();
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>{t('roomNotFound')}</Text>
        <Button label={t('backToHome')} variant="outline" onPress={() => router.replace('/online')} />
      </SafeAreaView>
    );
  }

  const mySeat = room.seats.find((s) => s.identityId === userId);
  const myPlayerId = mySeat?.playerId ?? null;

  // Final recap once the game is over.
  if (room.status === 'finished' && room.state) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.recap}>
          <RecapView state={room.state} onHome={goHome} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Live game once started.
  if (room.status !== 'lobby' && room.state) {
    return (
      <SafeAreaView style={styles.gameRoot} edges={['top']}>
        <OnlineGame
          code={room.code}
          state={room.state}
          myPlayerId={myPlayerId}
          turnDeadline={room.turnDeadline}
        />
      </SafeAreaView>
    );
  }

  // Lobby
  const isHost = room.hostId === userId;
  const onStart = async () => {
    setError(null);
    try {
      await startGame(room.code, rules);
    } catch (e) {
      setError(serverMessage(e));
    }
  };
  const onLeave = async () => {
    try {
      await leaveRoom(room.code);
    } catch {
      // Best-effort: navigate home regardless so the player is never stuck.
    }
    goHome();
  };

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.label}>{t('roomCode')}</Text>
      <Text style={styles.code}>{room.code}</Text>
      <Text style={styles.hint}>{t('shareCodeHint')}</Text>

      <Text style={styles.label}>
        {t('players')} · {room.seats.length}
      </Text>
      <ScrollView contentContainerStyle={styles.seats}>
        {room.seats.map((s) => (
          <View key={s.playerId} style={styles.seat}>
            <View style={[styles.token, { backgroundColor: s.token }]} />
            <Text style={styles.seatName}>{s.name}</Text>
            {s.identityId === room.hostId && <Text style={styles.badge}>{t('host')}</Text>}
            {s.identityId === userId && <Text style={styles.you}>{t('you')}</Text>}
          </View>
        ))}

        {isHost && (
          <View style={styles.rules}>
            <Text style={styles.label}>{t('houseRules')}</Text>
            <RulesPicker value={rules} onChange={setRules} />
          </View>
        )}
      </ScrollView>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        {isHost ? (
          <>
            <Button label={t('startGame')} disabled={room.seats.length < 2} onPress={onStart} />
            <Button label={t('backToHome')} variant="outline" onPress={() => router.replace('/')} />
          </>
        ) : (
          <>
            <Text style={styles.waiting}>{t('waitingForHost')}</Text>
            <Button label={t('leaveRoom')} variant="outline" onPress={onLeave} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function serverMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e && typeof (e as { data: unknown }).data === 'string') {
    return (e as { data: string }).data;
  }
  return e instanceof Error ? e.message : String(e);
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 10 },
  gameRoot: { flex: 1 },
  recap: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  muted: { fontFamily: Fonts.body, fontSize: 15, color: Brand.muted },
  label: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Brand.muted,
    marginTop: 8,
  },
  code: { fontFamily: Fonts.displayBlack, fontSize: 44, letterSpacing: 8, color: Brand.red },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Brand.muted },
  seats: { gap: 8, paddingVertical: 4 },
  rules: { gap: 8, marginTop: 12 },
  seat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  token: { width: 22, height: 22, borderRadius: 11 },
  seatName: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Brand.ink, flex: 1 },
  badge: {
    fontFamily: Fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Brand.gold,
  },
  you: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Brand.green },
  error: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Brand.red, textAlign: 'center' },
  waiting: { fontFamily: Fonts.body, fontSize: 14, color: Brand.muted, textAlign: 'center' },
  actions: { gap: 10, marginTop: 'auto' },
});
