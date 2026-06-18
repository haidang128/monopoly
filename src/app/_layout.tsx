import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n'; // side-effect: initialize i18next before any screen renders
import { Button } from '@/shared/ui/button';
import { Brand } from '@/shared/ui/brand';

/**
 * Root route-level error boundary. One screen throwing (e.g. an unexpected
 * engine state) shows a recoverable retry instead of a white-screen crash.
 * Children routes may export their own `ErrorBoundary` to scope failures
 * further. Crash reports go to Sentry once wired (Milestone 5).
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Đã xảy ra lỗi · Something went wrong</Text>
      <Text style={styles.errorBody}>{error.message}</Text>
      <Button label="Thử lại · Retry" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Brand.sand } }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  errorRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 28,
    backgroundColor: Brand.paper,
  },
  errorTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink, textAlign: 'center' },
  errorBody: { fontSize: 13, color: Brand.muted, textAlign: 'center' },
});
