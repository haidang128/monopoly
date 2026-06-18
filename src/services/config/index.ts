/**
 * The single typed, validated entry point for runtime configuration.
 *
 * Everything reads config from here — never from `expo-constants` directly — so
 * env access is one swappable seam, values are typed, and missing required keys
 * fail fast (loudly in dev, before they cause confusing runtime errors).
 */
import Constants from 'expo-constants';

type AppEnv = 'development' | 'preview' | 'production';

interface ExtraConfig {
  appEnv: AppEnv;
  convexUrl: string | null;
  analyticsKey: string | null;
  sentryDsn: string | null;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<ExtraConfig>;

export const config = {
  env: (extra.appEnv ?? 'development') as AppEnv,
  /** Convex deployment URL — required once online (Milestone 3) is enabled. */
  convexUrl: extra.convexUrl ?? null,
  analyticsKey: extra.analyticsKey ?? null,
  sentryDsn: extra.sentryDsn ?? null,
} as const;

export const isProd = config.env === 'production';
export const isDev = config.env === 'development';

/**
 * Validate that production-required keys are present. Call once at startup.
 * Throws in production so a misconfigured build never ships silently; warns in
 * dev so pass-and-play-only work isn't blocked.
 */
export function assertConfig(options: { requireOnline?: boolean } = {}): void {
  const missing: string[] = [];
  if (options.requireOnline && !config.convexUrl) missing.push('EXPO_PUBLIC_CONVEX_URL');
  if (isProd && !config.sentryDsn) missing.push('EXPO_PUBLIC_SENTRY_DSN');

  if (missing.length === 0) return;
  const message = `Missing required config: ${missing.join(', ')}`;
  if (isProd) throw new Error(message);
  console.warn(`[config] ${message} (non-fatal in ${config.env})`);
}
