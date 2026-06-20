/**
 * Board geometry — pure, framework-agnostic helpers that translate an engine
 * tile position (0..39 on the ring) into where it sits on the 11×11 visual board
 * and what short code / inner color-band edge it shows.
 *
 * No React / Expo imports: this is the testable counterpart of the hi-fi design's
 * `pos()` / `bandFor()` script in `Mobile monopoly design/Dai Gia Hifi.dc.html`.
 *
 * Layout (clockwise from the bottom-right GO corner), matching the design grid
 * `1.5fr repeat(9,1fr) 1.5fr`:
 *
 *   tl(20) ─ top 21..29 ─ tr(30)
 *     │                      │
 *   left 19..11        right 31..39
 *     │                      │
 *   bl(10) ─ bottom 9..1 ─ br(0)
 */

import type { Tile } from '@monopoly/engine';

/** Which side of the ring a perimeter tile lives on. */
export type Edge = 'top' | 'bottom' | 'left' | 'right';

/** The four corner positions on the ring. */
export const CORNERS = {
  /** GO / Xuất Phát — bottom-right. */
  bottomRight: 0,
  /** Jail / Tù — bottom-left. */
  bottomLeft: 10,
  /** Free parking / Đỗ — top-left. */
  topLeft: 20,
  /** Go-to-jail / Bắt — top-right. */
  topRight: 30,
} as const;

/**
 * Perimeter tiles per edge, excluding the corners, already in render order:
 * top/bottom run left→right, left/right run top→bottom. The center 9×9 region
 * is not part of any edge.
 */
export const EDGES: Record<Edge, readonly number[]> = {
  // bottom row, left→right: cells just right of the jail corner up to GO
  bottom: [9, 8, 7, 6, 5, 4, 3, 2, 1],
  // left column, top→bottom: below free-parking down to the jail corner
  left: [19, 18, 17, 16, 15, 14, 13, 12, 11],
  // top row, left→right: right of free-parking up to go-to-jail
  top: [21, 22, 23, 24, 25, 26, 27, 28, 29],
  // right column, top→bottom: below go-to-jail down to GO
  right: [31, 32, 33, 34, 35, 36, 37, 38, 39],
} as const;

/**
 * The inner edge a tile's color band hugs (the side facing the board center).
 * Returns null for corners, which carry no band.
 */
export function bandEdge(pos: number): Edge | null {
  if (EDGES.bottom.includes(pos)) return 'top';
  if (EDGES.top.includes(pos)) return 'bottom';
  if (EDGES.left.includes(pos)) return 'right';
  if (EDGES.right.includes(pos)) return 'left';
  return null;
}

/** Which physical edge of the ring a tile sits on (corners are their own case). */
export type Side = Edge | 'corner';

export function tileSide(pos: number): Side {
  if (pos === 0 || pos === 10 || pos === 20 || pos === 30) return 'corner';
  if (EDGES.bottom.includes(pos)) return 'bottom';
  if (EDGES.left.includes(pos)) return 'left';
  if (EDGES.top.includes(pos)) return 'top';
  return 'right';
}

/**
 * Rotation (deg) applied to a tile's content so its text faces inward, exactly
 * like a physical board: each side reads upright to the player sitting there.
 * Mirrors the design's `rot` per side.
 */
export function contentRotation(pos: number): number {
  switch (tileSide(pos)) {
    case 'left':
      return -90;
    case 'top':
      return 180;
    case 'right':
      return 90;
    default:
      return 0;
  }
}

/**
 * Grid cell (row, col), each 1..11, for a ring position — the flex-layout twin
 * of the design's `pos()`. Row 1 / col 1 are the top / left, row 11 / col 11 the
 * bottom / right; corners are at the four extremes.
 */
export function tileRC(pos: number): { row: number; col: number } {
  if (pos === CORNERS.bottomRight) return { row: 11, col: 11 };
  if (pos === CORNERS.bottomLeft) return { row: 11, col: 1 };
  if (pos === CORNERS.topLeft) return { row: 1, col: 1 };
  if (pos === CORNERS.topRight) return { row: 1, col: 11 };
  if (pos < 10) return { row: 11, col: 11 - pos }; // bottom edge
  if (pos < 20) return { row: 11 - (pos - 10), col: 1 }; // left edge
  if (pos < 30) return { row: 1, col: pos - 20 + 1 }; // top edge
  return { row: pos - 30 + 1, col: 11 }; // right edge
}

/**
 * Center of a grid track (1..11) expressed in the 12fr board space, accounting
 * for the 1.5fr corner tracks: track 1 → 0.75, tracks 2..10 → their index,
 * track 11 → 11.25.
 */
function trackCenterFr(track: number): number {
  if (track === 1) return 0.75;
  if (track === 11) return 11.25;
  return track;
}

/**
 * Center of a tile as fractions (0..1) of the full board square. Used by the
 * token overlay to place/animate pieces; the board is 12fr wide and tall.
 */
export function tileCenterFraction(pos: number): { fx: number; fy: number } {
  const { row, col } = tileRC(pos);
  return { fx: trackCenterFr(col) / 12, fy: trackCenterFr(row) / 12 };
}

const SPECIAL_CODES: Partial<Record<Tile['kind'], string>> = {
  go: 'XP',
  jail: 'TÙ',
  gotojail: 'BẮT',
  freeparking: 'ĐỖ',
  tax: 'THUẾ',
  station: 'GA',
};

const UTILITY_CODES: Record<string, string> = {
  dienLuc: 'EVN',
  capNuoc: 'NƯỚC',
};

/**
 * A compact code for a tile, sized for the tiny on-board cells. Cities use the
 * initials of their (Vietnamese) name; single-word names keep their short form.
 * Events show the deck marker (Cơ Hội = "?", Khí Vận = "KV").
 */
export function tileShortCode(tile: Tile): string {
  if (tile.kind === 'event') return tile.deck === 'co' ? '?' : 'KV';
  if (tile.kind === 'utility') return UTILITY_CODES[tile.id] ?? 'TIỆN';
  const special = SPECIAL_CODES[tile.kind];
  if (special) return special;
  // property: initials of the multi-word name, else the whole short word
  const words = tile.name.vi.trim().split(/\s+/);
  if (words.length === 1) return words[0].toUpperCase();
  return words.map((w) => w[0]).join('').toUpperCase();
}
