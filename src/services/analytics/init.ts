/**
 * Analytics startup wiring. Installs the concrete sink behind the {@link track}
 * facade once at launch.
 *
 * Dev gets a console sink so events are visible while building funnels. A real
 * vendor (PostHog / Amplitude) drops in here as a one-liner gated on
 * `config.analyticsKey` — e.g.
 *
 *   if (config.analyticsKey) setAnalyticsSink((e) => posthog.capture(e.name, e));
 *
 * with no call-site changes (everything already calls `track(...)`).
 */
import { setAnalyticsSink } from '@/services/analytics';
import { isDev } from '@/services/config';

let started = false;

export function initAnalytics(): void {
  if (started) return;
  started = true;
  if (isDev) {
    setAnalyticsSink((event) => {
      console.log('[analytics]', event.name, event);
    });
  }
  // Production vendor wired here once chosen (gated on config.analyticsKey).
}
