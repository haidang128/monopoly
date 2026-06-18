/**
 * Event card decks: "Cơ Hội" (chance-like) and "Khí Vận" (community-like).
 * All wording is original. Effects are plain data interpreted by the reducer,
 * which keeps the cards serializable and the rules in one place.
 */

import type { Card } from './types';

export const CO_CARDS: readonly Card[] = [
  {
    id: 'co-go',
    deck: 'co',
    text: { vi: 'Tiến về ô Xuất Phát. Nhận lương.', en: 'Advance to GO. Collect salary.' },
    effect: { kind: 'moveTo', pos: 0, collectGo: true },
  },
  {
    id: 'co-dividend',
    deck: 'co',
    text: { vi: 'Ngân hàng trả cổ tức. Nhận ₫500.', en: 'Bank pays a dividend. Collect ₫500.' },
    effect: { kind: 'collect', amount: 500 },
  },
  {
    id: 'co-fine',
    deck: 'co',
    text: { vi: 'Phạt vượt tốc độ. Nộp ₫300.', en: 'Speeding fine. Pay ₫300.' },
    effect: { kind: 'pay', amount: 300 },
  },
  {
    id: 'co-jail',
    deck: 'co',
    text: { vi: 'Vào tù ngay. Không qua Xuất Phát.', en: 'Go directly to jail. Do not pass GO.' },
    effect: { kind: 'goToJail' },
  },
  {
    id: 'co-getout',
    deck: 'co',
    text: { vi: 'Thẻ ra tù miễn phí. Giữ lại.', en: 'Get out of jail free. Keep it.' },
    effect: { kind: 'getOutOfJail' },
  },
  {
    id: 'co-advance3',
    deck: 'co',
    text: { vi: 'Tiến lên 3 ô.', en: 'Advance 3 spaces.' },
    effect: { kind: 'moveBy', steps: 3 },
  },
  {
    id: 'co-elite',
    deck: 'co',
    text: { vi: 'Đi tới Hà Nội. Nếu qua Xuất Phát, nhận lương.', en: 'Travel to Hà Nội. If you pass GO, collect salary.' },
    effect: { kind: 'moveTo', pos: 37, collectGo: true },
  },
  {
    id: 'co-repairs',
    deck: 'co',
    text: { vi: 'Sửa chữa: ₫250/nhà, ₫1.000/khách sạn.', en: 'Repairs: ₫250 per house, ₫1,000 per hotel.' },
    effect: { kind: 'repairs', perHouse: 250, perHotel: 1000 },
  },
  {
    id: 'co-gift',
    deck: 'co',
    text: { vi: 'Trúng thưởng. Nhận ₫1.500.', en: 'You win a prize. Collect ₫1,500.' },
    effect: { kind: 'collect', amount: 1500 },
  },
];

export const KHI_CARDS: readonly Card[] = [
  {
    id: 'khi-go',
    deck: 'khi',
    text: { vi: 'Tiến về ô Xuất Phát. Nhận lương.', en: 'Advance to GO. Collect salary.' },
    effect: { kind: 'moveTo', pos: 0, collectGo: true },
  },
  {
    id: 'khi-inherit',
    deck: 'khi',
    text: { vi: 'Thừa kế. Nhận ₫1.000.', en: 'You inherit money. Collect ₫1,000.' },
    effect: { kind: 'collect', amount: 1000 },
  },
  {
    id: 'khi-tax',
    deck: 'khi',
    text: { vi: 'Đóng thuế dịch vụ. Nộp ₫500.', en: 'Service tax. Pay ₫500.' },
    effect: { kind: 'pay', amount: 500 },
  },
  {
    id: 'khi-birthday',
    deck: 'khi',
    text: { vi: 'Sinh nhật. Mỗi người tặng bạn ₫200.', en: "It's your birthday. Collect ₫200 from each player." },
    effect: { kind: 'collectFromEach', amount: 200 },
  },
  {
    id: 'khi-feast',
    deck: 'khi',
    text: { vi: 'Khao bạn bè. Trả mỗi người ₫150.', en: 'You host a feast. Pay each player ₫150.' },
    effect: { kind: 'payEach', amount: 150 },
  },
  {
    id: 'khi-getout',
    deck: 'khi',
    text: { vi: 'Thẻ ra tù miễn phí. Giữ lại.', en: 'Get out of jail free. Keep it.' },
    effect: { kind: 'getOutOfJail' },
  },
  {
    id: 'khi-jail',
    deck: 'khi',
    text: { vi: 'Vào tù ngay. Không qua Xuất Phát.', en: 'Go directly to jail. Do not pass GO.' },
    effect: { kind: 'goToJail' },
  },
  {
    id: 'khi-refund',
    deck: 'khi',
    text: { vi: 'Hoàn thuế. Nhận ₫400.', en: 'Tax refund. Collect ₫400.' },
    effect: { kind: 'collect', amount: 400 },
  },
  {
    id: 'khi-hospital',
    deck: 'khi',
    text: { vi: 'Viện phí. Nộp ₫400.', en: 'Hospital fees. Pay ₫400.' },
    effect: { kind: 'pay', amount: 400 },
  },
];

/** Look a card up by deck + index into that deck's table. */
export function cardAt(deck: 'co' | 'khi', index: number): Card {
  const table = deck === 'co' ? CO_CARDS : KHI_CARDS;
  const card = table[index];
  if (!card) throw new Error(`No ${deck} card at index ${index}`);
  return card;
}

export const CO_COUNT = CO_CARDS.length;
export const KHI_COUNT = KHI_CARDS.length;
