/**
 * Auction panel — the `auction` phase action area.
 *
 * One bidder acts at a time (`auction.active[auction.turn]`). They raise the
 * standing bid (`AUCTION_BID`, must beat `highBid` and be affordable) or drop
 * out (`AUCTION_PASS`); the engine resolves to the last bidder standing. The
 * parent remounts this panel per turn/bid (via `key`) so the local bid amount
 * resets to a fresh suggested raise each time control passes.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BOARD, type Action, type GameState, getPlayer, labelOf } from '@monopoly/engine';
import { haptics } from '@/services/haptics';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

const STEP = 100;

export function AuctionPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const auction = state.auction!;
  const bidder = getPlayer(state, auction.active[auction.turn]!);
  const highBidder = auction.highBidder ? getPlayer(state, auction.highBidder) : null;
  const minBid = auction.highBid + 1;

  const [amount, setAmount] = useState(() =>
    clamp(auction.highBid + STEP, minBid, bidder.cash),
  );

  const canBid = amount > auction.highBid && amount <= bidder.cash;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>
        {t('auction')}: {labelOf(BOARD[auction.pos]!)[locale]}
      </Text>
      <Text style={styles.high}>
        {auction.highBid > 0 && highBidder
          ? `${t('highBid')}: ${formatDong(auction.highBid)} · ${highBidder.name}`
          : t('noBids')}
      </Text>
      <Text style={styles.turn}>{t('toBid', { name: bidder.name })}</Text>

      {/* bid stepper */}
      <View style={styles.stepper}>
        <Step label="−" onPress={() => setAmount((a) => Math.max(minBid, a - STEP))} />
        <Text style={styles.amount}>{formatDong(amount)}</Text>
        <Step label="+" onPress={() => setAmount((a) => Math.min(bidder.cash, a + STEP))} />
      </View>

      <Button
        label={t('bid')}
        disabled={!canBid}
        onPress={() => {
          haptics.tap();
          dispatch({ type: 'AUCTION_BID', player: bidder.id, amount });
        }}
      />
      <Button
        label={t('pass')}
        variant="outline"
        onPress={() => dispatch({ type: 'AUCTION_PASS', player: bidder.id })}
      />
    </View>
  );
}

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}
    >
      <Text style={styles.stepLabel}>{label}</Text>
    </Pressable>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  title: { fontFamily: Fonts.display, fontSize: 16, color: Brand.ink, textAlign: 'center' },
  high: { fontFamily: Fonts.body, fontSize: 13, color: Brand.muted, textAlign: 'center' },
  turn: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Brand.ink, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPressed: { opacity: 0.6 },
  stepLabel: { fontFamily: Fonts.bodyBold, fontSize: 22, color: Brand.ink, lineHeight: 26 },
  amount: {
    fontFamily: Fonts.bodyBlack,
    fontSize: 20,
    color: Brand.ink,
    fontVariant: ['tabular-nums'],
    minWidth: 120,
    textAlign: 'center',
  },
});
