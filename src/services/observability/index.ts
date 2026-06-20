/**
 * Observability seam (Milestone 5) — crash + error reporting via Sentry.
 *
 * Like the analytics facade, this is wired from day one but **inert until a DSN
 * is configured** (`EXPO_PUBLIC_SENTRY_DSN` → `config.sentryDsn`), so local dev
 * and pass-and-play-only builds report nothing. Call `initObservability()` once
 * at startup; report handled errors through `captureError` so call sites never
 * touch the Sentry SDK directly.
 */
import * as Sentry from '@sentry/react-native';

import { config, isDev } from '@/services/config';

let started = false;

/** Initialize Sentry if a DSN is set. Idempotent; no-op without a DSN. */
export function initObservability(): void {
  if (started) return;
  started = true;
  // Require a real DSN string — a non-string (e.g. a stray `{}` from config
  // tooling) would crash the native SDK trying to parse it as a URL.
  if (typeof config.sentryDsn !== 'string' || config.sentryDsn.length === 0) return;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.env,
    // Full traces in dev, sampled in prod to keep quota sane.
    tracesSampleRate: isDev ? 1.0 : 0.2,
  });
}

/** Report a handled error. No-op without a DSN; never throws. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (typeof config.sentryDsn !== 'string' || config.sentryDsn.length === 0) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Crash reporting must never break the app.
  }
}
