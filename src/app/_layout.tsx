import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/services/storage/init'; // side-effect: promote to MMKV before any prefs/saves are read
import '@/i18n'; // side-effect: initialize i18next before any screen renders
import { initAnalytics } from '@/services/analytics/init';
import { ConvexClientProvider } from '@/services/convex/client';
import { captureError, initObservability } from '@/services/observability';
import { Button } from '@/shared/ui/button';
import { Brand } from '@/shared/ui/brand';
import { Fonts, fontMap } from '@/shared/ui/fonts';

// Crash reporting + analytics first, so early errors are captured.
initObservability();
initAnalytics();

// Hold the splash until the design typefaces are ready (avoids a font swap flash).
SplashScreen.preventAutoHideAsync();

/**
 * Root route-level error boundary. One screen throwing (e.g. an unexpected
 * engine state) shows a recoverable retry instead of a white-screen crash.
 * Children routes may export their own `ErrorBoundary` to scope failures
 * further. Crash reports go to Sentry once wired (Milestone 5).
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    captureError(error, { boundary: 'root' });
  }, [error]);
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Đã xảy ra lỗi · Something went wrong</Text>
      <Text style={styles.errorBody}>{error.message}</Text>
      <Button label="Thử lại · Retry" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontMap);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Keep the splash up until fonts resolve (or fail — don't block forever on error).
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.backdrop}>
      <View style={styles.frame}>
        <ConvexClientProvider>
          <SafeAreaProvider>
            <Stack
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Brand.sand } }}
            />
          </SafeAreaProvider>
        </ConvexClientProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // On web, sit the mobile app in a centered phone-width column over a backdrop;
  // on native it's a plain full-screen passthrough.
  backdrop: {
    flex: 1,
    ...Platform.select({
      web: { backgroundColor: '#D9CDB5', alignItems: 'center' },
      default: {},
    }),
  },
  frame: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: { maxWidth: 440, boxShadow: '0 0 48px rgba(33,28,22,0.18)' },
      default: {},
    }),
  },
  errorRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 28,
    backgroundColor: Brand.paper,
  },
  errorTitle: { fontFamily: Fonts.display, fontSize: 18, color: Brand.ink, textAlign: 'center' },
  errorBody: { fontFamily: Fonts.body, fontSize: 13, color: Brand.muted, textAlign: 'center' },
});
