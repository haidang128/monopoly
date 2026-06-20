/**
 * Debt panel — the `mustResolveDebt` phase action area.
 *
 * The debtor owes more than their cash on hand. They can open Assets to raise
 * cash (mortgage / sell houses is legal in this phase), pay the debt once they
 * can afford it (`PAY_DEBT`), or declare bankruptcy (`DECLARE_BANKRUPTCY`). The
 * creditor and reason come straight from `state.debt` (the reason is already
 * localized by the engine).
 */
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { type Action, type GameState, maxRaisable } from '@monopoly/engine';
import { haptics } from '@/services/haptics';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

export function DebtPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const debt = state.debt;
  if (!debt) return null;

  const debtor = state.players.find((p) => p.id === debt.from);
  if (!debtor) return null;
  const creditorName =
    debt.to === 'bank' ? t('bank') : (state.players.find((p) => p.id === debt.to)?.name ?? '');

  const canPay = debtor.cash >= debt.amount;
  const raisable = maxRaisable(state, debtor.id);
  const couldAfford = raisable >= debt.amount;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{t('debtTitle')}</Text>
      <Text style={styles.reason}>{debt.reason[locale]}</Text>
      <Text style={styles.amount}>
        {debtor.name} → {creditorName}: {formatDong(debt.amount)}
      </Text>

      {!canPay && (
        <Text style={styles.hint}>
          {t('raiseHint')} · {t('raisable')} {formatDong(raisable)}
        </Text>
      )}

      <Button label={t('assets')} variant="outline" onPress={() => router.push('./portfolio')} />
      <Button
        label={`${t('pay')} ${formatDong(debt.amount)}`}
        disabled={!canPay}
        onPress={() => {
          haptics.tap();
          dispatch({ type: 'PAY_DEBT', player: debt.from });
        }}
      />
      <Button
        label={t('bankruptcy')}
        variant="outline"
        onPress={() => {
          haptics.error();
          dispatch({ type: 'DECLARE_BANKRUPTCY', player: debt.from });
        }}
      />
      {!canPay && couldAfford && <Text style={styles.note}>{t('raiseThenPay')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  title: { fontFamily: Fonts.display, fontSize: 16, color: Brand.red, textAlign: 'center' },
  reason: { fontFamily: Fonts.body, fontSize: 13, color: Brand.muted, textAlign: 'center' },
  amount: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Brand.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Brand.muted, textAlign: 'center' },
  note: { fontFamily: Fonts.body, fontSize: 11, color: Brand.green, textAlign: 'center' },
});
