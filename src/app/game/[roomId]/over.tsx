import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecapView } from '@/features/game/recap/recap-view';
import { useGameActions, useGameState } from '@/features/game/store/pass-and-play';

export default function GameOverScreen() {
  const router = useRouter();
  const state = useGameState();
  const { reset } = useGameActions();

  if (!state || state.phase !== 'gameOver') return <Redirect href="/" />;

  const goHome = () => {
    reset();
    router.replace('/');
  };
  const playAgain = () => {
    reset();
    router.replace('/setup');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <RecapView state={state} onHome={goHome} onPlayAgain={playAgain} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
});
