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

import type { Card, CardEffect } from '@monopoly/engine';
import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

/** Category pill (label key + color) derived from the card's plain-data effect. */
function tagFor(effect: CardEffect): { key: string; color: string } {
  switch (effect.kind) {
    case 'collect':
    case 'collectFromEach':
    case 'getOutOfJail':
      return { key: 'tagCollect', color: Brand.green };
    case 'pay':
    case 'payEach':
    case 'repairs':
      return { key: 'tagPenalty', color: Brand.red };
    case 'goToJail':
      return { key: 'tagJail', color: Brand.red };
    default:
      return { key: 'tagMove', color: '#2E6E5E' };
  }
}

export function EventCardReveal({ card, onDismiss }: { card: Card; onDismiss: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'vi';
  const isChance = card.deck === 'co';
  const accent = isChance ? Brand.gold : Brand.green;
  const onAccent = isChance ? Brand.ink : Brand.paper;
  const tag = tagFor(card.effect);

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityRole="button" />

      <Animated.View entering={ZoomIn.springify().damping(15)} exiting={ZoomOut} style={styles.card}>
        <View style={[styles.header, { backgroundColor: accent }]}>
          <Text style={[styles.title, { color: onAccent }]}>
            {isChance ? t('chance') : t('community')}
          </Text>
          <View style={[styles.badge, { borderColor: onAccent }]}>
            <Text style={[styles.badgeText, { color: onAccent }]}>{isChance ? '?' : '◆'}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.illo}>
            <Text style={styles.illoText}>{t('illo')}</Text>
          </View>
          <Text style={styles.text} selectable>
            {card.text[locale]}
          </Text>
          <Text style={[styles.tag, { color: tag.color, borderColor: tag.color }]}>
            {t(tag.key)}
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
  title: { fontFamily: Fonts.display, fontSize: 22, letterSpacing: 0.8 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: Fonts.display, fontSize: 18 },
  body: { padding: 24, gap: 16, alignItems: 'center' },
  illo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D8C8A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illoText: { fontFamily: Fonts.mono, fontSize: 9, letterSpacing: 0.8, color: Brand.muted, textTransform: 'uppercase' },
  text: { fontFamily: Fonts.displaySemi, textAlign: 'center', fontSize: 19, lineHeight: 26, color: Brand.ink },
  tag: {
    fontFamily: Fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    borderWidth: 1,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingVertical: 4,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  cta: {
    width: '100%',
    backgroundColor: Brand.red,
    paddingVertical: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    boxShadow: '0 8px 16px rgba(178,58,44,0.28)',
  },
  ctaText: { fontFamily: Fonts.bodyBold, color: Brand.paper, fontSize: 16 },
});
