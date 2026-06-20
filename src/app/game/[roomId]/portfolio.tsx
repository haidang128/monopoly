import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PortfolioSheet } from '@/features/game/portfolio/portfolio-sheet';
import { useGameState, usePassAndPlayStore } from '@/features/game/store/pass-and-play';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';

/**
 * Route wrapper: presents the read-only {@link PortfolioSheet} as a form sheet
 * off the game screen (see `presentation: 'formSheet'` in this folder's layout).
 * Thin by design — reads authoritative state, the feature component renders it.
 */
export default function PortfolioRoute() {
  const { t } = useTranslation();
  const state = useGameState();
  const dispatch = usePassAndPlayStore((s) => s.dispatch);
  if (!state) return <Redirect href="/" />;

  return (
    <View style={styles.root}>
      <PortfolioSheet state={state} dispatch={dispatch} />
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
