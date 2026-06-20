/**
 * Convex client provider with auth. Creates a single reactive client from the
 * configured deployment URL and wraps the tree in `ConvexAuthProvider` so every
 * request carries the signed-in identity's JWT — which the server reads via
 * `ctx.auth.getUserIdentity()` (Milestone 4 security fix). With no URL configured
 * (the pass-and-play-only build), it renders children unchanged — online features
 * stay dormant.
 *
 * Guest-first: `AnonymousGate` signs the device in anonymously on launch, so a
 * stable server-verified identity exists before any online action is dispatched.
 *
 * Tokens persist in `expo-secure-store` on native (required for React Native);
 * on web the provider falls back to `localStorage`.
 */
import { ConvexAuthProvider, useAuthActions, type TokenStorage } from '@convex-dev/auth/react';
import { ConvexReactClient, useConvexAuth } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { config } from '@/services/config';

let client: ConvexReactClient | null = null;

/** The shared client, or null when online play isn't configured. */
export function getConvexClient(): ConvexReactClient | null {
  const url = config.convexUrl;
  if (typeof url !== 'string' || !url.includes('://')) return null;
  if (!client) client = new ConvexReactClient(url);
  return client;
}

/** Secure token storage for native. (Web uses the provider's localStorage default.) */
const secureStorage: TokenStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

/** Silently sign the device in as an anonymous guest once auth is ready. */
function AnonymousGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Best-effort: a failed sign-in just leaves online actions unavailable.
      void signIn('anonymous').catch(() => {});
    }
  }, [isLoading, isAuthenticated, signIn]);

  return <>{children}</>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const c = getConvexClient();
  if (!c) return <>{children}</>;
  return (
    <ConvexAuthProvider
      client={c}
      storage={Platform.OS === 'web' ? undefined : secureStorage}
      storageNamespace={config.convexUrl ?? 'monopoly'}
    >
      <AnonymousGate>{children}</AnonymousGate>
    </ConvexAuthProvider>
  );
}
