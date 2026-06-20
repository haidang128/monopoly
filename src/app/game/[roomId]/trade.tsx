import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { TradeSheet } from '@/features/game/trade/trade-sheet';
import {
  useGameError,
  useGameState,
  usePassAndPlayStore,
} from '@/features/game/store/pass-and-play';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';

/**
 * Route wrapper: presents the {@link TradeSheet} as a form sheet off the game
 * screen (see `presentation: 'formSheet'` in this folder's layout). Reads
 * authoritative state + the dispatch seam; the feature component owns the flow.
 */
export default function TradeRoute() {
  const { t } = useTranslation();
  const state = useGameState();
  const error = useGameError();
  const dispatch = usePassAndPlayStore((s) => s.dispatch);
  if (!state) return <Redirect href="/" />;

  return (
    <View style={styles.root}>
      <TradeSheet state={state} dispatch={dispatch} error={error} onDone={() => router.back()} />
      <View style={styles.footer}>
        <Button label={t('close')} variant="outline" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.sand },
  footer: { padding: 16, paddingTop: 0 },
});
