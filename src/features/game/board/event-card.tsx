/**
 * Event-card reveal. A dimmed overlay with a cream card that springs in when a
 * Cơ Hội (chance) / Khí Vận (community) card is drawn, showing the card text and
 * a Continue button. Tapping the backdrop or the button dismisses it.
 *
 * Mirrors the hi-fi design: gold header + "?" badge for Cơ Hội, green for Khí
 * Vận. Reanimated entering/exiting presets drive the in/out animation.
 */
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

import type { Card } from '@monopoly/engine';
import { Brand } from '@/shared/ui/brand';

export function EventCardReveal({ card, onDismiss }: { card: Card; onDismiss: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const isChance = card.deck === 'co';
  const accent = isChance ? Brand.gold : Brand.green;
  const onAccent = isChance ? Brand.ink : Brand.paper;

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityRole="button" />

      <Animated.View entering={ZoomIn.springify().damping(15)} exiting={ZoomOut} style={styles.card}>
        <View style={[styles.header, { backgroundColor: accent }]}>
          <Text style={[styles.title, { color: onAccent }]}>
            {isChance ? t('chance') : t('community')}
          </Text>
          <View style={[styles.badge, { borderColor: onAccent }]}>
            <Text style={[styles.badgeText, { color: onAccent }]}>{isChance ? '?' : '✦'}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.text} selectable>
            {card.text[locale]}
          </Text>
          <Pressable style={styles.cta} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.ctaText}>{t('continue')}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(33,28,22,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    zIndex: 100,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Brand.paper,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: 'hidden',
    transform: [{ rotate: '-1.5deg' }],
    boxShadow: '0 22px 44px rgba(0,0,0,0.35)',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontWeight: '800', fontSize: 22, letterSpacing: 0.8 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontWeight: '800', fontSize: 18 },
  body: { padding: 24, gap: 20, alignItems: 'center' },
  text: { textAlign: 'center', fontWeight: '600', fontSize: 19, lineHeight: 26, color: Brand.ink },
  cta: {
    width: '100%',
    backgroundColor: Brand.red,
    paddingVertical: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    boxShadow: '0 8px 16px rgba(178,58,44,0.28)',
  },
  ctaText: { color: Brand.paper, fontWeight: '700', fontSize: 16 },
});
