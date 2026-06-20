import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Card } from '@monopoly/engine';
import { Board } from '@/features/game/board/board';
import { Dice } from '@/features/game/board/dice';
import { EventCardReveal } from '@/features/game/board/event-card';
import { TileDeed } from '@/features/game/board/tile-deed';
import { AuctionPanel } from '@/features/game/auction/auction-panel';
import { DebtPanel } from '@/features/game/debt/debt-panel';
import { JailPanel } from '@/features/game/jail/jail-panel';
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
import { Fonts } from '@/shared/ui/fonts';

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

      <Board
        players={state.players}
        holdings={state.holdings}
        locale={locale}
        onTilePress={(pos) => setSelectedPos((cur) => (cur === pos ? null : pos))}
      />

      {/* tap-to-inspect title deed */}
      {selectedPos != null && (
        <TileDeed
          state={state}
          pos={selectedPos}
          locale={locale}
          onClose={() => setSelectedPos(null)}
        />
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
        {state.phase === 'jailOptions' && <JailPanel state={state} dispatch={dispatch} />}
        {state.phase === 'mustResolveDebt' && state.debt && (
          <DebtPanel state={state} dispatch={dispatch} />
        )}
        {state.phase === 'auction' && state.auction && (
          <AuctionPanel
            key={`${state.auction.turn}-${state.auction.highBid}`}
            state={state}
            dispatch={dispatch}
          />
        )}
        <View style={styles.manageRow}>
          <Button
            label={t('assets')}
            variant="outline"
            style={styles.flex}
            onPress={() => router.push('./portfolio')}
          />
          {(state.phase === 'preRoll' || state.phase === 'turnEnd' || state.pendingTrade) &&
            state.players.filter((p) => !p.bankrupt).length > 1 && (
              <Button
                label={state.pendingTrade ? t('reviewTrade') : t('trade')}
                variant="outline"
                style={styles.flex}
                onPress={() => router.push('./trade')}
              />
            )}
        </View>
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
  chipName: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Brand.ink },
  chipCash: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Brand.ink, fontVariant: ['tabular-nums'] },
  status: { alignItems: 'center', gap: 4 },
  turnLabel: { fontFamily: Fonts.display, fontSize: 18, color: Brand.ink },
  log: { fontFamily: Fonts.body, fontSize: 13, color: Brand.muted, textAlign: 'center' },
  error: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Brand.red, textAlign: 'center' },
  actions: { gap: 10 },
  manageRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
