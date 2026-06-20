/**
 * Jail panel — the `jailOptions` phase action area.
 *
 * The current player (in jail at the start of their turn) chooses how to get
 * out: pay the fine (`JAIL_PAY`), spend a get-out-of-jail card (`JAIL_CARD`),
 * or roll for doubles (`JAIL_ROLL`). Options are shown only when legal — the
 * card button appears only with a card in hand, paying only when affordable.
 * On the third failed roll the engine forces the player out, so this panel
 * always offers the roll.
 */
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { type Action, type GameState, currentPlayer } from '@monopoly/engine';
import { haptics } from '@/services/haptics';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

export function JailPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
}) {
  const { t } = useTranslation();
  const player = currentPlayer(state);
  const fine = state.config.rules.jailFine;
  const canPay = player.cash >= fine;
  const hasCard = player.getOutCards > 0;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{t('inJail')}</Text>
      <Text style={styles.sub}>{t('jailAttempt', { n: player.jailTurns + 1 })}</Text>

      <Button
        label={t('rollDoubles')}
        onPress={() => dispatch({ type: 'JAIL_ROLL', player: player.id })}
      />
      <Button
        label={`${t('payFine')} ${formatDong(fine)}`}
        variant="outline"
        disabled={!canPay}
        onPress={() => {
          haptics.tap();
          dispatch({ type: 'JAIL_PAY', player: player.id });
        }}
      />
      {hasCard && (
        <Button
          label={t('useJailCard')}
          variant="outline"
          onPress={() => dispatch({ type: 'JAIL_CARD', player: player.id })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  title: { fontFamily: Fonts.display, fontSize: 16, color: Brand.red, textAlign: 'center' },
  sub: { fontFamily: Fonts.body, fontSize: 12, color: Brand.muted, textAlign: 'center' },
});
