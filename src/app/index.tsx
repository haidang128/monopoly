import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ResumeOnlineCard } from '@/features/game/online/resume-card';
import { track } from '@/services/analytics';
import { setLanguage, type Language } from '@/i18n';
import { Button } from '@/shared/ui/button';
import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

/** City-value group colors from the hi-fi design, shown as dots over the hero. */
const LEGEND_DOTS = [
  '#955436',
  '#86C5E8',
  '#D63E96',
  '#F08A24',
  '#E03A3A',
  '#F4C430',
  '#2BA85A',
  '#1565A8',
];

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    track({ name: 'app_open' });
  }, []);

  const toggleLang = () => setLanguage((i18n.language === 'vi' ? 'en' : 'vi') as Language);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.langRow}>
        <Pressable accessibilityRole="button" onPress={toggleLang} style={styles.langPill}>
          <Text style={styles.langText}>{i18n.language === 'vi' ? 'Tiếng Việt' : 'English'}</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoMark}>₫</Text>
          </View>
          <Text style={styles.title}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Sunset-skyline cover art from the new design (assets/art/hero.png). */}
        <View style={styles.heroCard}>
          <Image
            style={StyleSheet.absoluteFill}
            source={require('@/assets/art/hero.png')}
            contentFit="cover"
            contentPosition="bottom"
            transition={300}
          />
          <View style={styles.heroScrim} />
          <View style={styles.heroDots}>
            {LEGEND_DOTS.map((c) => (
              <View key={c} style={[styles.dot, { backgroundColor: c }]} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button label={t('passAndPlay')} onPress={() => router.push('/setup')} />
        <Button label={t('playOnline')} variant="outline" onPress={() => router.push('/online')} />
        <ResumeOnlineCard />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            track({ name: 'how_to_play_open' });
            router.push('/how-to-play');
          }}
          hitSlop={8}
        >
          <Text style={styles.howTo}>{t('howToPlay')} ›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.paper,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: 36,
  },
  langRow: { alignItems: 'flex-end', paddingTop: 8 },
  langPill: {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Brand.paper,
  },
  langText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Brand.ink },
  hero: { flex: 1, justifyContent: 'center', gap: 18, paddingVertical: 12 },
  brand: { alignItems: 'center', gap: 12 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    boxShadow: '0 10px 22px rgba(178,58,44,0.32)',
  },
  logoMark: { fontFamily: Fonts.displayBlack, color: Brand.paper, fontSize: 36 },
  title: { fontFamily: Fonts.display, fontSize: 36, color: Brand.ink, textAlign: 'center' },
  tagline: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Brand.muted,
  },
  heroCard: {
    flex: 1,
    minHeight: 150,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: Brand.ink,
    borderWidth: 1,
    borderColor: '#DBCFB8',
    justifyContent: 'flex-end',
    boxShadow: '0 16px 34px rgba(33,28,22,0.22)',
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage:
      'linear-gradient(to top, rgba(33,28,22,0.45), rgba(33,28,22,0) 50%)',
  },
  heroDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 14,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  actions: { gap: 12 },
  howTo: { fontFamily: Fonts.bodySemi, textAlign: 'center', color: Brand.red, marginTop: 6 },
});
