/**
 * Online game view. Renders authoritative `GameState` from Convex and dispatches
 * actions to the server, which validates + broadcasts. Reuses the exact same
 * presentational pieces as pass-and-play (board, dice, event card, jail/debt/
 * auction panels) — only the state source and dispatch differ.
 *
 * You may act only for the seat this device owns, and only when it's that seat's
 * turn (or its bid in an auction); the server enforces this too.
 */
import { useConvexConnectionState } from 'convex/react';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Action, type Card, type GameState, type PlayerId } from '@monopoly/engine';
import { AuctionPanel } from '@/features/game/auction/auction-panel';
import { Board } from '@/features/game/board/board';
import { Dice } from '@/features/game/board/dice';
import { EventCardReveal } from '@/features/game/board/event-card';
import { JailPanel } from '@/features/game/jail/jail-panel';
import { DebtPanel } from '@/features/game/debt/debt-panel';
import { TileDeed } from '@/features/game/board/tile-deed';
import { haptics } from '@/services/haptics';
import { useOnlineDispatch } from '@/services/convex';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

export function OnlineGame({
  code,
  state,
  myPlayerId,
  turnDeadline,
}: {
  code: string;
  state: GameState;
  myPlayerId: PlayerId | null;
  turnDeadline?: number | null;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const sendOnline = useOnlineDispatch(code);
  const { isWebSocketConnected } = useConvexConnectionState();
  const [error, setError] = useState<string | null>(null);
  const [selectedPos, setSelectedPos] = useState<number | null>(null);

  // Fire-and-forget dispatch; surface a rejected server action as recoverable.
  const dispatch = (action: Action) => {
    setError(null);
    void sendOnline(action).catch((e: unknown) => setError(serverMessage(e)));
  };

  // reveal each drawn event card exactly once
  const [revealCard, setRevealCard] = useState<Card | null>(null);
  const lastDrawSeen = useRef(0);
  const lastCard = state.lastCard;
  useEffect(() => {
    if (lastCard && lastCard.draw !== lastDrawSeen.current) {
      lastDrawSeen.current = lastCard.draw;
      setRevealCard(lastCard.card);
      haptics.tap();
    }
  }, [lastCard]);

  const actor = actingPlayer(state);
  const canAct = actor != null && actor === myPlayerId;
  const actorName = state.players.find((p) => p.id === actor)?.name ?? '';
  const lastLog = state.log[state.log.length - 1];

  const isMyTurn = !!myPlayerId && state.order[state.current] === myPlayerId;
  const pendingTradeForMe = !!myPlayerId && state.pendingTrade?.to === myPlayerId;
  const canTrade = (isMyTurn || pendingTradeForMe) && !state.winner;

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.strip}>
          {state.players.map((p) => (
            <View
              key={p.id}
              style={[
                styles.chip,
                p.id === actor && styles.chipActive,
                p.id === myPlayerId && styles.chipMine,
                p.bankrupt && styles.chipOut,
              ]}
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

        {selectedPos != null && (
          <TileDeed state={state} pos={selectedPos} locale={locale} onClose={() => setSelectedPos(null)} />
        )}

        <View style={styles.status}>
          <Text style={styles.turn}>
            {canAct ? t('yourTurnOnline') : t('waitingFor', { name: actorName })}
          </Text>
          {state.phase !== 'gameOver' && <TurnTimer deadline={turnDeadline} />}
          <Dice values={state.dice} />
          {lastLog && <Text style={styles.log}>{lastLog.text[locale]}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        {canAct && !isWebSocketConnected && (
          <Text style={styles.offline}>{t('reconnecting')}</Text>
        )}

        {canAct && isWebSocketConnected && (
          <View style={styles.actions}>
            {state.phase === 'preRoll' && (
              <Button label={t('rollDice')} onPress={() => dispatch({ type: 'ROLL', player: myPlayerId! })} />
            )}
            {state.phase === 'awaitBuy' && (
              <>
                <Button
                  label={t('buy')}
                  onPress={() => {
                    haptics.tap();
                    dispatch({ type: 'BUY', player: myPlayerId! });
                  }}
                />
                <Button
                  label={t('pass')}
                  variant="outline"
                  onPress={() => dispatch({ type: 'DECLINE_BUY', player: myPlayerId! })}
                />
              </>
            )}
            {state.phase === 'turnEnd' && (
              <Button label={t('endTurn')} onPress={() => dispatch({ type: 'END_TURN', player: myPlayerId! })} />
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
          </View>
        )}

        {/* asset management — available to everyone (read-only off-turn) */}
        <View style={styles.manageRow}>
          <Button
            label={t('assets')}
            variant="outline"
            style={styles.flex}
            onPress={() => router.push(`/online/${code}/portfolio`)}
          />
          {canTrade && (
            <Button
              label={pendingTradeForMe ? t('reviewTrade') : t('trade')}
              variant="outline"
              style={styles.flex}
              onPress={() => router.push(`/online/${code}/trade`)}
            />
          )}
        </View>
      </ScrollView>

      {revealCard && <EventCardReveal card={revealCard} onDismiss={() => setRevealCard(null)} />}
    </>
  );
}

/** Live countdown to the turn deadline; turns red in the final 10s. */
function TurnTimer({ deadline }: { deadline?: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!deadline) return null;
  const secs = Math.max(0, Math.ceil((deadline - now) / 1000));
  return <Text style={[styles.timer, secs <= 10 && styles.timerLow]}>⏱ {secs}s</Text>;
}

/** Whose input the game is waiting on: the bidder in an auction, else the current player. */
function actingPlayer(state: GameState): PlayerId | null {
  if (state.phase === 'auction' && state.auction) {
    return state.auction.active[state.auction.turn] ?? null;
  }
  if (state.phase === 'mustResolveDebt' && state.debt) return state.debt.from;
  return state.order[state.current] ?? null;
}

/** Pull the human message out of a Convex error (ConvexError carries `.data`). */
function serverMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e && typeof (e as { data: unknown }).data === 'string') {
    return (e as { data: string }).data;
  }
  return e instanceof Error ? e.message : String(e);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 12, gap: 12 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
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
  chipMine: { backgroundColor: '#FBF2DE' },
  chipOut: { opacity: 0.45 },
  token: { width: 18, height: 18, borderRadius: 9 },
  chipName: { fontFamily: Fonts.bodySemi, fontSize: 10, color: Brand.ink },
  chipCash: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Brand.ink, fontVariant: ['tabular-nums'] },
  status: { alignItems: 'center', gap: 4 },
  turn: { fontFamily: Fonts.display, fontSize: 18, color: Brand.ink, textAlign: 'center' },
  timer: { fontFamily: Fonts.monoMedium, fontSize: 12, color: Brand.muted, fontVariant: ['tabular-nums'] },
  timerLow: { color: Brand.red },
  log: { fontFamily: Fonts.body, fontSize: 13, color: Brand.muted, textAlign: 'center' },
  error: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Brand.red, textAlign: 'center' },
  actions: { gap: 10 },
  offline: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Brand.red, textAlign: 'center' },
  manageRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
