import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppleSignInButton } from '@/features/game/online/apple-sign-in-button';
import { getDisplayName, setDisplayName } from '@/services/auth';
import { useOnlineActions } from '@/services/convex';
import { setLastRoom } from '@/services/storage';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

/**
 * Online entry: pick a display name, then create a room or join one by code.
 * Both paths seat you server-side, then route to the room screen.
 */
export default function OnlineEntry() {
  const { t } = useTranslation();
  const { createRoom, joinRoom } = useOnlineActions();

  const [name, setName] = useState(getDisplayName() ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = () => name.trim() || t('playerNamePlaceholder');

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      setDisplayName(name.trim());
      const { code: created } = await createRoom({ name: displayName() });
      setLastRoom(created);
      router.push(`/online/${created}`);
    } catch (e) {
      setError(serverMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) {
      setError(t('enterCode'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setDisplayName(name.trim());
      await joinRoom(c, { name: displayName() });
      setLastRoom(c);
      router.push(`/online/${c}`);
    } catch (e) {
      setError(serverMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>{t('playOnline')}</Text>

      <Text style={styles.label}>{t('yourName')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('playerNamePlaceholder')}
        placeholderTextColor={Brand.muted}
        style={styles.input}
        maxLength={16}
      />

      <View style={styles.block}>
        <Button label={t('createRoom')} disabled={busy} onPress={onCreate} />
      </View>

      <View style={styles.divider} />

      <Text style={styles.label}>{t('joinCode')}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="ABCD"
        placeholderTextColor={Brand.muted}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={4}
        style={[styles.input, styles.codeInput]}
      />
      <Button label={t('join')} variant="outline" disabled={busy} onPress={onJoin} />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.apple}>
        <AppleSignInButton />
      </View>

      <View style={styles.back}>
        <Button label={t('backToHome')} variant="outline" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

function serverMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e && typeof (e as { data: unknown }).data === 'string') {
    return (e as { data: string }).data;
  }
  return e instanceof Error ? e.message : String(e);
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 12 },
  title: { fontFamily: Fonts.display, fontSize: 30, color: Brand.ink, marginBottom: 8 },
  label: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Brand.muted,
  },
  input: {
    fontFamily: Fonts.bodySemi,
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  codeInput: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  block: { marginTop: 4 },
  apple: { marginTop: 16 },
  divider: { height: 1, backgroundColor: Brand.line, marginVertical: 12 },
  error: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Brand.red, textAlign: 'center' },
  back: { marginTop: 'auto' },
});
