/**
 * Native "Sign in with Apple" button (iOS only).
 *
 * Guest-first: this is an *optional upgrade* shown alongside guest play. It uses
 * the native Apple dialog to get an identity token, then hands it to Convex Auth
 * (`signIn('apple', { idToken })`), which verifies it server-side. Renders
 * nothing on Android/web or when Apple auth is unavailable, and hides itself once
 * the player has upgraded (no longer anonymous).
 *
 * Apple only returns the user's name on the *first* sign-in, so we persist it as
 * the display name when present.
 */
import { useAuthActions } from '@convex-dev/auth/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useIdentity, setDisplayName } from '@/services/auth';
import { useMe } from '@/services/convex';
import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

export function AppleSignInButton() {
  const { t } = useTranslation();
  const { signIn } = useAuthActions();
  const { userId } = useIdentity();
  const me = useMe();
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  // Only offer the upgrade to a signed-in guest who hasn't linked Apple yet.
  if (!available || !userId || me?.isAnonymous === false) return null;

  const onPress = async () => {
    setError(null);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) return;
      const name = cred.fullName?.givenName
        ? [cred.fullName.givenName, cred.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      if (name) setDisplayName(name);
      await signIn('apple', name ? { idToken: cred.identityToken, name } : { idToken: cred.identityToken });
    } catch (e) {
      // The user canceling the native dialog isn't an error worth surfacing.
      if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') return;
      setError(t('appleSignInFailed'));
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{t('appleUpgradeHint')}</Text>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={styles.button}
        onPress={onPress}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Brand.muted, textAlign: 'center' },
  button: { height: 48, width: '100%' },
  error: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Brand.red, textAlign: 'center' },
});
