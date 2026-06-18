/**
 * The Cờ Tỷ Phú Việt board: 8 city tiers, 4 stations (GA), 2 utilities, events,
 * taxes and the four corners. All content is original (Vietnamese cities and
 * tier names) — it deliberately does not reuse any Hasbro property names, the
 * exact classic tile identities, or Chance/Community-Chest wording.
 *
 * The ring follows the familiar 40-tile rhythm so the rules read naturally, but
 * every label, price and color is our own.
 */

import type { Group, Tile } from './types';

export const GROUPS: Record<string, Group> = {
  venVung: {
    id: 'venVung',
    name: { vi: 'Vùng Ven', en: 'Outskirts' },
    color: '#8B5A2B',
    price: 480,
    houseCost: 400,
    mortgage: 240,
    rents: [16, 32, 80, 240, 560, 800, 1000],
  },
  taybac: {
    id: 'taybac',
    name: { vi: 'Tây Bắc', en: 'Northwest' },
    color: '#7FB2D9',
    price: 800,
    houseCost: 400,
    mortgage: 400,
    rents: [48, 96, 240, 600, 1440, 2000, 2400],
  },
  dongbang: {
    id: 'dongbang',
    name: { vi: 'Đồng Bằng', en: 'Lowlands' },
    color: '#D8488E',
    price: 1120,
    houseCost: 800,
    mortgage: 560,
    rents: [64, 128, 400, 1000, 2400, 3200, 3600],
  },
  mientrung: {
    id: 'mientrung',
    name: { vi: 'Miền Trung', en: 'Central' },
    color: '#F08A24',
    price: 1440,
    houseCost: 800,
    mortgage: 720,
    rents: [112, 224, 560, 1600, 3600, 4400, 5000],
  },
  taynguyen: {
    id: 'taynguyen',
    name: { vi: 'Tây Nguyên', en: 'Highlands' },
    color: '#B23A2C',
    price: 1840,
    houseCost: 1200,
    mortgage: 920,
    rents: [144, 288, 720, 2000, 4400, 5400, 6000],
  },
  duyenhai: {
    id: 'duyenhai',
    name: { vi: 'Duyên Hải', en: 'Coastal' },
    color: '#F4C430',
    price: 2240,
    houseCost: 1200,
    mortgage: 1120,
    rents: [176, 352, 800, 2200, 4800, 5800, 6400],
  },
  trongdiem: {
    id: 'trongdiem',
    name: { vi: 'Trọng Điểm', en: 'Prime' },
    color: '#2BA85A',
    price: 2560,
    houseCost: 1600,
    mortgage: 1280,
    rents: [208, 416, 900, 2400, 5400, 6600, 7400],
  },
  caocap: {
    id: 'caocap',
    name: { vi: 'Cao Cấp', en: 'Elite' },
    color: '#1565A8',
    price: 3200,
    houseCost: 1600,
    mortgage: 1600,
    rents: [280, 560, 1400, 3000, 5600, 6800, 8000],
  },
};

const STATION_RENTS = [400, 800, 1600, 3200] as const;
const STATION_PRICE = 1600;
const STATION_MORTGAGE = 800;

const UTILITY_PRICE = 1200;
const UTILITY_MORTGAGE = 600;
const UTILITY_MULT = [4, 10] as const;

function city(pos: number, group: string, id: string, vi: string, en: string): Tile {
  return { pos, kind: 'property', group, id, name: { vi, en } };
}
function station(pos: number, id: string, vi: string, en: string): Tile {
  return {
    pos,
    kind: 'station',
    id,
    name: { vi, en },
    price: STATION_PRICE,
    rents: STATION_RENTS,
    mortgage: STATION_MORTGAGE,
  };
}
function utility(pos: number, id: string, vi: string, en: string): Tile {
  return {
    pos,
    kind: 'utility',
    id,
    name: { vi, en },
    price: UTILITY_PRICE,
    mortgage: UTILITY_MORTGAGE,
    multipliers: UTILITY_MULT,
  };
}

export const BOARD: readonly Tile[] = [
  { pos: 0, kind: 'go', name: { vi: 'Xuất Phát', en: 'GO' } },
  city(1, 'venVung', 'haGiang', 'Hà Giang', 'Hà Giang'),
  { pos: 2, kind: 'event', deck: 'khi' },
  city(3, 'venVung', 'laiChau', 'Lai Châu', 'Lai Châu'),
  { pos: 4, kind: 'tax', name: { vi: 'Thuế Thu Nhập', en: 'Income Tax' }, amount: 2000 },
  station(5, 'gaHanoi', 'Ga Hà Nội', 'Hà Nội Station'),
  city(6, 'taybac', 'dienBien', 'Điện Biên', 'Điện Biên'),
  { pos: 7, kind: 'event', deck: 'co' },
  city(8, 'taybac', 'sonLa', 'Sơn La', 'Sơn La'),
  city(9, 'taybac', 'hoaBinh', 'Hòa Bình', 'Hòa Bình'),
  { pos: 10, kind: 'jail', name: { vi: 'Trại Giam', en: 'Jail' } },
  city(11, 'dongbang', 'namDinh', 'Nam Định', 'Nam Định'),
  utility(12, 'dienLuc', 'Điện Lực', 'Power Co.'),
  city(13, 'dongbang', 'thaiBinh', 'Thái Bình', 'Thái Bình'),
  city(14, 'dongbang', 'ninhBinh', 'Ninh Bình', 'Ninh Bình'),
  station(15, 'gaVinh', 'Ga Vinh', 'Vinh Station'),
  city(16, 'mientrung', 'vinh', 'Vinh', 'Vinh'),
  { pos: 17, kind: 'event', deck: 'khi' },
  city(18, 'mientrung', 'hue', 'Huế', 'Huế'),
  city(19, 'mientrung', 'quangNgai', 'Quảng Ngãi', 'Quảng Ngãi'),
  { pos: 20, kind: 'freeparking', name: { vi: 'Bãi Đỗ Xe', en: 'Free Parking' } },
  city(21, 'taynguyen', 'quyNhon', 'Quy Nhơn', 'Quy Nhơn'),
  { pos: 22, kind: 'event', deck: 'co' },
  city(23, 'taynguyen', 'buonMaThuot', 'Buôn Ma Thuột', 'Buôn Ma Thuột'),
  city(24, 'taynguyen', 'pleiku', 'Pleiku', 'Pleiku'),
  station(25, 'gaDaNang', 'Ga Đà Nẵng', 'Đà Nẵng Station'),
  city(26, 'duyenhai', 'nhaTrang', 'Nha Trang', 'Nha Trang'),
  city(27, 'duyenhai', 'daLat', 'Đà Lạt', 'Đà Lạt'),
  utility(28, 'capNuoc', 'Cấp Nước', 'Water Co.'),
  city(29, 'duyenhai', 'vungTau', 'Vũng Tàu', 'Vũng Tàu'),
  { pos: 30, kind: 'gotojail', name: { vi: 'Vào Tù', en: 'Go To Jail' } },
  city(31, 'trongdiem', 'haiPhong', 'Hải Phòng', 'Hải Phòng'),
  city(32, 'trongdiem', 'canTho', 'Cần Thơ', 'Cần Thơ'),
  { pos: 33, kind: 'event', deck: 'khi' },
  city(34, 'trongdiem', 'daNang', 'Đà Nẵng', 'Đà Nẵng'),
  station(35, 'gaSaiGon', 'Ga Sài Gòn', 'Sài Gòn Station'),
  { pos: 36, kind: 'event', deck: 'co' },
  city(37, 'caocap', 'haNoi', 'Hà Nội', 'Hà Nội'),
  { pos: 38, kind: 'tax', name: { vi: 'Thuế Tài Sản', en: 'Luxury Tax' }, amount: 1000 },
  city(39, 'caocap', 'hcm', 'TP. Hồ Chí Minh', 'Hồ Chí Minh City'),
];

export const GO_POS = 0;
export const JAIL_POS = 10;
export const GOTOJAIL_POS = 30;
export const BOARD_SIZE = BOARD.length; // 40

/** All board positions belonging to a color group. */
export function groupPositions(groupId: string): number[] {
  return BOARD.filter((t) => t.kind === 'property' && t.group === groupId).map((t) => t.pos);
}

/** All station positions on the board. */
export const STATION_POSITIONS = BOARD.filter((t) => t.kind === 'station').map((t) => t.pos);
/** All utility positions on the board. */
export const UTILITY_POSITIONS = BOARD.filter((t) => t.kind === 'utility').map((t) => t.pos);
