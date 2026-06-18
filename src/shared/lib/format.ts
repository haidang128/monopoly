/**
 * Shared formatting primitives. Cross-feature helpers live under `src/shared/`
 * so features depend on shared, never on each other.
 */

/** Format an amount of in-game đồng, e.g. 12000 → "₫12.000" (VN grouping). */
export function formatDong(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `₫${grouped}`;
}
