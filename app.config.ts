import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered on top of the static `app.json`.
 *
 * Expo passes the parsed `app.json` in as `config`; we spread it and inject an
 * `extra` block from environment variables (set per EAS Build profile:
 * development / preview / production). Public values use the `EXPO_PUBLIC_*`
 * convention so they're available at runtime; secrets must NEVER be placed here
 * (anything in `extra` ships in the bundle).
 *
 * Read these at runtime through `src/services/config`, not `expo-constants`
 * directly, so there is a single typed, validated access point.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'monopoly',
  slug: config.slug ?? 'monopoly',
  extra: {
    ...config.extra,
    appEnv: process.env.APP_ENV ?? 'development',
    // Wired in Milestone 3 (online). Null is fine for pass-and-play-only builds.
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL ?? null,
    analyticsKey: process.env.EXPO_PUBLIC_ANALYTICS_KEY ?? null,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
  },
});
