/**
 * Game-over recap: winner, final standings ranked by net worth, a few stats, and
 * a native share. Pure/presentational — it reads a finished `GameState` and calls
 * back for navigation, so both pass-and-play (`app/game/[roomId]/over`) and online
 * (the finished room) can reuse it.
 */
import { netWorth, type GameState } from '@monopoly/engine';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

const MEDALS = ['🥇', '🥈', '🥉'];
/** Ink/paper text on a token fill, by perceived luminance (matches board tokens). */
function inkOn(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? Brand.ink : Brand.paper;
}

export function RecapView({
  state,
  onHome,
  onPlayAgain,
}: {
  state: GameState;
  onHome: () => void;
  onPlayAgain?: () => void;
}) {
  const { t } = useTranslation();

  const propsOwned = (id: string) =>
    Object.values(state.holdings).filter((h) => h.owner === id).length;

  const ranked = [...state.players].sort(
    (a, b) => Number(a.bankrupt) - Number(b.bankrupt) || netWorth(state, b.id) - netWorth(state, a.id),
  );
  const winner = state.players.find((p) => p.id === state.winner) ?? ranked[0];

  const onShare = async () => {
    const lines = ranked.map(
      (p, i) => `${i + 1}. ${p.name} — ${formatDong(netWorth(state, p.id))}`,
    );
    const message = `${t('appName')} 🏆\n${t('winner', { name: winner?.name ?? '' })}\n\n${lines.join('\n')}`;
    try {
      await Share.share({ message });
    } catch {
      // Sharing unavailable (e.g. web) or dismissed — nothing to recover.
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.crown}>♛</Text>
      <Text style={styles.title}>{t('winner', { name: winner?.name ?? '' })}</Text>
      <Text style={styles.stats}>
        {t('finalStandings')} · {t('turnsPlayed', { n: state.turnId })}
      </Text>

      <View style={styles.board}>
        {ranked.map((p, i) => (
          <View key={p.id} style={[styles.row, i === 0 && styles.rowWin]}>
            <Text style={styles.rank}>{MEDALS[i] ?? i + 1}</Text>
            <View style={[styles.token, { backgroundColor: p.token }]}>
              <Text style={[styles.tokenText, { color: inkOn(p.token) }]}>
                {p.name.trim().charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.who}>
              <Text style={styles.name} numberOfLines={1}>
                {p.name}
                {p.bankrupt ? ' 💥' : ''}
              </Text>
              <Text style={styles.sub}>{t('propertiesCount', { n: propsOwned(p.id) })}</Text>
            </View>
            <Text style={styles.worth}>{formatDong(netWorth(state, p.id))}</Text>
          </View>
        ))}
      </View>

      <Pressable onPress={onShare} accessibilityRole="button" style={styles.share}>
        <Text style={styles.shareText}>↗  {t('shareResult')}</Text>
      </Pressable>

      <View style={styles.actions}>
        {onPlayAgain && <Button label={t('rematch')} onPress={onPlayAgain} />}
        <Button label={t('backToHome')} variant={onPlayAgain ? 'outline' : 'primary'} onPress={onHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', alignItems: 'center', gap: 10 },
  crown: { fontSize: 40, color: Brand.gold },
  title: { fontFamily: Fonts.display, fontSize: 28, color: Brand.ink, textAlign: 'center' },
  stats: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Brand.muted,
  },
  board: { alignSelf: 'stretch', gap: 8, marginVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowWin: { borderColor: Brand.gold, borderWidth: 2 },
  rank: { fontFamily: Fonts.display, width: 28, fontSize: 18, color: Brand.ink, textAlign: 'center' },
  token: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tokenText: { fontFamily: Fonts.bodyBlack, fontSize: 14 },
  who: { flex: 1, gap: 2 },
  name: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Brand.ink },
  sub: { fontFamily: Fonts.body, fontSize: 12, color: Brand.muted },
  worth: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Brand.ink, fontVariant: ['tabular-nums'] },
  share: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.paper,
  },
  shareText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Brand.red },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 8 },
});
