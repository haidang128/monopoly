/**
 * Analytics facade.
 *
 * Components and stores call `track(...)` with a **typed** event; they never
 * touch a vendor SDK. A no-op sink is the default, so analytics is wired (seam
 * exists from day one) but vendor-free until we choose one — and swapping
 * PostHog ↔ Amplitude later is a one-line `setAnalyticsSink` change with no
 * call-site churn. Emit from the dispatch/store layer, not scattered in views,
 * to keep funnels clean (time-to-first-roll, online vs pass-and-play retention).
 */

export type AnalyticsEvent =
  | { name: 'app_open' }
  | { name: 'game_started'; mode: 'passAndPlay' | 'online'; players: number }
  | { name: 'first_roll'; mode: 'passAndPlay' | 'online' }
  | { name: 'game_completed'; mode: 'passAndPlay' | 'online'; turns: number }
  | { name: 'trade_sent' }
  | { name: 'property_bought' }
  | { name: 'bankruptcy' }
  | { name: 'language_changed'; language: string };

export type AnalyticsSink = (event: AnalyticsEvent) => void;

let sink: AnalyticsSink = () => {};

/** Install the real analytics implementation (e.g. PostHog) once at startup. */
export function setAnalyticsSink(next: AnalyticsSink): void {
  sink = next;
}

export function track(event: AnalyticsEvent): void {
  try {
    sink(event);
  } catch {
    // Analytics must never break gameplay.
  }
}
