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
        <View style={styles.logo}>
          <Text style={styles.logoMark}>₫</Text>
        </View>
        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.tagline}>{t('tagline')}</Text>
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
  root: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingBottom: 36 },
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
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
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
  actions: { gap: 12 },
  howTo: { fontFamily: Fonts.bodySemi, textAlign: 'center', color: Brand.red, marginTop: 6 },
});
