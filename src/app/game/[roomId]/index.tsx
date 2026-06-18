import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BOARD,
  GROUPS,
  isOwnable,
  labelOf,
  priceOf,
  type Card,
} from '@monopoly/engine';
import { Board } from '@/features/game/board/board';
import { Dice } from '@/features/game/board/dice';
import { EventCardReveal } from '@/features/game/board/event-card';
import { haptics } from '@/services/haptics';
import {
  useCurrentPlayer,
  useGameError,
  useGameState,
  usePassAndPlayStore,
} from '@/features/game/store/pass-and-play';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';

/**
 * Game screen: reads authoritative state from the store and dispatches engine
 * `Action`s. The hi-fi board now renders the live ring; dice/card animations and
 * the full bottom sheets (portfolio/trade/build) land in later M2 sub-steps.
 */
export default function GameScreen() {
  const { t, i18n } = useTranslation();
  useLocalSearchParams<{ roomId: string }>();
  const state = useGameState();
  const current = useCurrentPlayer();
  const error = useGameError();
  const dispatch = usePassAndPlayStore((s) => s.dispatch);
  const [selectedPos, setSelectedPos] = useState<number | null>(null);

  // reveal each drawn event card exactly once (lastCard.draw only increments)
  const [revealCard, setRevealCard] = useState<Card | null>(null);
  const lastDrawSeen = useRef(0);
  const lastCard = state?.lastCard ?? null;
  useEffect(() => {
    if (lastCard && lastCard.draw !== lastDrawSeen.current) {
      lastDrawSeen.current = lastCard.draw;
      setRevealCard(lastCard.card);
      haptics.tap();
    }
  }, [lastCard]);

  if (!state) return <Redirect href="/" />;
  if (state.phase === 'gameOver') return <Redirect href="./over" />;

  const me = current?.id ?? '';
  const lastLog = state.log[state.log.length - 1];
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const selected = selectedPos != null ? BOARD[selectedPos] : null;

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {/* player cash strip */}
      <View style={styles.strip}>
        {state.players.map((p) => (
          <View
            key={p.id}
            style={[styles.chip, p.id === me && styles.chipActive, p.bankrupt && styles.chipOut]}
          >
            <View style={[styles.token, { backgroundColor: p.token }]} />
            <Text style={styles.chipName} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={styles.chipCash}>{formatDong(p.cash)}</Text>
          </View>
        ))}
      </View>

      <Board players={state.players} holdings={state.holdings} onTilePress={setSelectedPos} />

      {/* tap-to-inspect detail */}
      {selected && (
        <View style={styles.inspect}>
          <Text style={styles.inspectName}>{labelOf(selected)[locale]}</Text>
          {isOwnable(selected) && (
            <Text style={styles.inspectMeta}>
              {formatDong(priceOf(selected))}
              {state.holdings[selected.pos] &&
                ` · ${state.players.find((p) => p.id === state.holdings[selected.pos]!.owner)?.name}`}
              {selected.kind === 'property' && ` · ${GROUPS[selected.group]?.name[locale]}`}
            </Text>
          )}
        </View>
      )}

      {/* turn status */}
      <View style={styles.status}>
        <Text style={styles.turnLabel}>{t('yourTurn', { name: current?.name ?? '' })}</Text>
        <Dice values={state.dice} />
        {lastLog && <Text style={styles.log}>{lastLog.text[locale]}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      {/* action bar */}
      <View style={styles.actions}>
        {state.phase === 'preRoll' && (
          <Button label={t('rollDice')} onPress={() => dispatch({ type: 'ROLL', player: me })} />
        )}
        {state.phase === 'awaitBuy' && (
          <>
            <Button
              label={t('buy')}
              onPress={() => {
                haptics.tap();
                dispatch({ type: 'BUY', player: me });
              }}
            />
            <Button
              label={t('pass')}
              variant="outline"
              onPress={() => dispatch({ type: 'DECLINE_BUY', player: me })}
            />
          </>
        )}
        {state.phase === 'turnEnd' && (
          <Button label={t('endTurn')} onPress={() => dispatch({ type: 'END_TURN', player: me })} />
        )}
        {state.phase === 'jailOptions' && (
          <Button label={t('rollDice')} onPress={() => dispatch({ type: 'JAIL_ROLL', player: me })} />
        )}
        {state.phase === 'mustResolveDebt' && state.debt && (
          <>
            <Text style={styles.owe}>
              {state.debt.from} → {state.debt.to}: {formatDong(state.debt.amount)}
            </Text>
            <Button label="Pay" onPress={() => dispatch({ type: 'PAY_DEBT', player: state.debt!.from })} />
            <Button
              label="Bankrupt"
              variant="outline"
              onPress={() => dispatch({ type: 'DECLARE_BANKRUPTCY', player: state.debt!.from })}
            />
          </>
        )}
        {state.phase === 'auction' && state.auction && (
          <Button
            label={t('pass')}
            onPress={() =>
              dispatch({ type: 'AUCTION_PASS', player: state.auction!.active[state.auction!.turn]! })
            }
          />
        )}
      </View>
      </ScrollView>

      {revealCard && (
        <EventCardReveal card={revealCard} onDismiss={() => setRevealCard(null)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 12, gap: 12 },
  strip: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
    backgroundColor: Brand.paper,
  },
  chipActive: { borderColor: Brand.gold, borderWidth: 2 },
  chipOut: { opacity: 0.45 },
  token: { width: 18, height: 18, borderRadius: 9 },
  chipName: { fontSize: 10, fontWeight: '600', color: Brand.ink },
  chipCash: { fontSize: 11, fontWeight: '700', color: Brand.ink, fontVariant: ['tabular-nums'] },
  inspect: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Brand.paper,
    padding: 10,
    gap: 2,
  },
  inspectName: { fontSize: 14, fontWeight: '700', color: Brand.ink },
  inspectMeta: { fontSize: 12, color: Brand.muted },
  status: { alignItems: 'center', gap: 4 },
  turnLabel: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  log: { fontSize: 13, color: Brand.muted, textAlign: 'center' },
  error: { fontSize: 12, color: Brand.red, textAlign: 'center' },
  owe: { fontSize: 14, fontWeight: '700', color: Brand.red, textAlign: 'center' },
  actions: { gap: 10 },
});
