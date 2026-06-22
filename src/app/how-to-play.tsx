/**
 * How-to-play / rules screen. Reached from the Home "How to play" link.
 *
 * Content is bilingual and co-located here (the engine's `{ vi, en }` Localized
 * pattern) rather than threaded through i18next: it's a large block of
 * screen-specific prose, so keeping both languages side by side is clearer than
 * scattering dozens of keys across the shared resource files. The numbers quoted
 * are the **Classic** preset defaults (see `features/game/rules/presets.ts`);
 * the screen says so, since house rules can change them.
 */
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

interface Section {
  icon: string;
  title: string;
  points: string[];
}

const CONTENT: Record<'vi' | 'en', { intro: string; sections: Section[]; footer: string }> = {
  en: {
    intro: 'Buy property, charge rent, and bankrupt everyone else. Last tycoon standing wins.',
    sections: [
      {
        icon: '🎯',
        title: 'The goal',
        points: [
          'Be the last player who isn’t bankrupt.',
          '2–6 players. Pass & play on one device, or play online — each on their own phone.',
        ],
      },
      {
        icon: '🎲',
        title: 'Your turn',
        points: [
          'Roll the two dice and move that many tiles.',
          'Roll doubles and you go again — but three doubles in a row sends you straight to jail.',
          'Each time you pass Xuất Phát (GO), collect your salary (₫2,000 in Classic).',
        ],
      },
      {
        icon: '🏠',
        title: 'Buying property',
        points: [
          'Land on an unowned property, station, or utility and you may Buy it or Pass.',
          'If you Pass and “Auction declined tiles” is on, it goes to the highest bidder among all players.',
        ],
      },
      {
        icon: '💰',
        title: 'Rent',
        points: [
          'Land on a tile someone owns and you pay them rent.',
          'Owning every tile in a colour group doubles its rent and lets you build.',
          'Houses and a hotel raise rent sharply; stations and utilities scale with how many you own.',
          'Mortgaged tiles charge no rent.',
        ],
      },
      {
        icon: '🃏',
        title: 'Cards',
        points: [
          'Land on Cơ Hội (Chance) or Khí Vận (Community) and draw a card.',
          'Do what it says — collect, pay, move, or go to jail.',
        ],
      },
      {
        icon: '🏦',
        title: 'Tax & Free Parking',
        points: [
          'Income Tax and Luxury Tax are paid to the bank.',
          'With the Free Parking jackpot rule on, those payments pile into the pot — land on Bãi Đỗ Xe to scoop it.',
        ],
      },
      {
        icon: '🚔',
        title: 'Jail',
        points: [
          'You go to jail by landing on Vào Tù, drawing a jail card, or rolling three doubles in a row.',
          'To get out: pay the fine (₫500 in Classic), use a get-out-of-jail card, or roll doubles.',
          'After three failed attempts you pay the fine and leave.',
        ],
      },
      {
        icon: '🔧',
        title: 'Managing & trading',
        points: [
          'Anytime on your turn: build or sell houses on full sets, and mortgage or unmortgage tiles to raise cash.',
          'Propose a trade to swap properties and cash with another player.',
        ],
      },
      {
        icon: '💥',
        title: 'Going bankrupt',
        points: [
          'Owe more than you can pay — even after mortgaging and selling houses — and you’re bankrupt and out.',
          'When only one player remains, they win.',
        ],
      },
      {
        icon: '⚙️',
        title: 'House rules',
        points: [
          'Pick a preset before you start: Classic (balanced), Quick (cash-rich, Free Parking jackpot), or Marathon (lean cash, steep jail fine).',
          'Or tune starting cash, GO salary, jail fine, auctions, and the jackpot yourself.',
        ],
      },
    ],
    footer: 'All set — tap back and start a game.',
  },
  vi: {
    intro: 'Mua đất, thu tiền thuê và khiến mọi người phá sản. Tỷ phú cuối cùng còn trụ lại sẽ thắng.',
    sections: [
      {
        icon: '🎯',
        title: 'Mục tiêu',
        points: [
          'Trở thành người chơi cuối cùng chưa phá sản.',
          '2–6 người. Chuyền tay trên một máy, hoặc chơi online — mỗi người một điện thoại.',
        ],
      },
      {
        icon: '🎲',
        title: 'Lượt của bạn',
        points: [
          'Gieo hai viên xúc xắc và đi số ô tương ứng.',
          'Gieo ra đôi thì được đi tiếp — nhưng ba lần đôi liên tiếp sẽ bị tống thẳng vào tù.',
          'Mỗi khi qua ô Xuất Phát, bạn nhận lương (₫2.000 ở chế độ Cổ điển).',
        ],
      },
      {
        icon: '🏠',
        title: 'Mua đất',
        points: [
          'Dừng ở ô đất, nhà ga hoặc dịch vụ chưa có chủ, bạn có thể Mua hoặc Bỏ qua.',
          'Nếu bỏ qua và luật “Đấu giá ô bị từ chối” đang bật, ô đó được đấu giá cho người trả cao nhất.',
        ],
      },
      {
        icon: '💰',
        title: 'Tiền thuê',
        points: [
          'Dừng ở ô của người khác thì bạn phải trả tiền thuê cho họ.',
          'Sở hữu trọn một nhóm màu giúp tăng gấp đôi tiền thuê và cho phép xây nhà.',
          'Nhà và khách sạn làm tiền thuê tăng mạnh; nhà ga và dịch vụ tính theo số lượng bạn sở hữu.',
          'Ô đang thế chấp không thu tiền thuê.',
        ],
      },
      {
        icon: '🃏',
        title: 'Lá bài',
        points: [
          'Dừng ở ô Cơ Hội hoặc Khí Vận thì rút một lá bài.',
          'Làm theo nội dung bài — nhận tiền, nộp tiền, di chuyển hoặc vào tù.',
        ],
      },
      {
        icon: '🏦',
        title: 'Thuế & Bãi Đỗ Xe',
        points: [
          'Thuế Thu Nhập và Thuế Tài Sản được nộp cho ngân hàng.',
          'Khi bật luật hũ Bãi Đỗ Xe, các khoản nộp này dồn vào hũ — dừng ở ô Bãi Đỗ Xe để hốt trọn.',
        ],
      },
      {
        icon: '🚔',
        title: 'Nhà tù',
        points: [
          'Bạn vào tù khi dừng ở ô Vào Tù, rút trúng bài đi tù, hoặc gieo ba lần đôi liên tiếp.',
          'Để ra tù: nộp phạt (₫500 ở chế độ Cổ điển), dùng thẻ ra tù, hoặc gieo ra đôi.',
          'Sau ba lần thử thất bại, bạn phải nộp phạt và ra tù.',
        ],
      },
      {
        icon: '🔧',
        title: 'Quản lý & trao đổi',
        points: [
          'Bất cứ lúc nào trong lượt: xây hoặc bán nhà trên nhóm đủ bộ, thế chấp hoặc chuộc lại đất để xoay tiền.',
          'Đề nghị trao đổi để đổi đất và tiền với người chơi khác.',
        ],
      },
      {
        icon: '💥',
        title: 'Phá sản',
        points: [
          'Nợ nhiều hơn khả năng chi trả — kể cả sau khi thế chấp và bán nhà — thì bạn phá sản và bị loại.',
          'Khi chỉ còn một người chơi, người đó thắng.',
        ],
      },
      {
        icon: '⚙️',
        title: 'Luật nhà',
        points: [
          'Chọn một preset trước khi bắt đầu: Cổ điển (cân bằng), Nhanh (nhiều tiền, có hũ Bãi Đỗ Xe), hoặc Đường dài (ít tiền, phạt tù nặng).',
          'Hoặc tự chỉnh vốn ban đầu, lương Xuất Phát, phạt tù, đấu giá và hũ tiền.',
        ],
      },
    ],
    footer: 'Xong rồi — nhấn quay lại và bắt đầu chơi.',
  },
};

export default function HowToPlayScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const content = i18n.language === 'vi' ? CONTENT.vi : CONTENT.en;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={goBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('howToPlay')}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{content.intro}</Text>

        {content.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.icon}>{section.icon}  </Text>
              {section.title}
            </Text>
            {section.points.map((point) => (
              <View key={point} style={styles.point}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.footer}>{content.footer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.sand },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  backChevron: { fontFamily: Fonts.display, fontSize: 26, color: Brand.ink, marginTop: -4 },
  headerTitle: { fontFamily: Fonts.display, fontSize: 22, color: Brand.ink },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  intro: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: Brand.muted,
    marginBottom: 22,
  },
  section: { marginBottom: 22 },
  sectionTitle: { fontFamily: Fonts.displayBold, fontSize: 18, color: Brand.red, marginBottom: 8 },
  icon: { fontSize: 16 },
  point: { flexDirection: 'row', gap: 8, marginBottom: 6, paddingRight: 4 },
  bullet: { fontFamily: Fonts.body, fontSize: 14, color: Brand.gold, lineHeight: 21 },
  pointText: { flex: 1, fontFamily: Fonts.body, fontSize: 14, lineHeight: 21, color: Brand.ink },
  footer: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: Brand.muted,
    textAlign: 'center',
    marginTop: 6,
  },
});
