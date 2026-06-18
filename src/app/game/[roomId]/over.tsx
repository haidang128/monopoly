import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGameActions, useGameState } from '@/features/game/store/pass-and-play';
import { formatDong } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Brand } from '@/shared/ui/brand';

export default function GameOverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const state = useGameState();
  const { reset } = useGameActions();

  if (!state || state.phase !== 'gameOver') return <Redirect href="/" />;

  const winner = state.players.find((p) => p.id === state.winner);
  const ranked = [...state.players].sort((a, b) => Number(a.bankrupt) - Number(b.bankrupt) || b.cash - a.cash);

  const goHome = () => {
    reset();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.crown}>♛</Text>
      <Text style={styles.title}>{t('winner', { name: winner?.name ?? '' })}</Text>
      <View style={styles.board}>
        {ranked.map((p, i) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={[styles.token, { backgroundColor: p.token }]} />
            <Text style={styles.name}>
              {p.name}
              {p.bankrupt ? ' · 💥' : ''}
            </Text>
            <Text style={styles.cash}>{formatDong(p.cash)}</Text>
          </View>
        ))}
      </View>
      <Button label={t('backToHome')} onPress={goHome} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 28, alignItems: 'center', gap: 12 },
  crown: { fontSize: 40, marginTop: 24 },
  title: { fontSize: 30, fontWeight: '800', color: Brand.ink },
  board: { alignSelf: 'stretch', gap: 8, marginVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 18, fontSize: 16, fontWeight: '700', color: Brand.ink },
  token: { width: 24, height: 24, borderRadius: 12 },
  name: { flex: 1, fontSize: 16, color: Brand.ink },
  cash: { fontSize: 13, fontWeight: '700', color: Brand.ink },
});
