import { type HouseRules } from '@monopoly/engine';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RULE_PRESETS } from '@/features/game/rules/presets';
import { RulesPicker } from '@/features/game/rules/rules-picker';
import { useGameActions } from '@/features/game/store/pass-and-play';
import { haptics } from '@/services/haptics';
import { Brand } from '@/shared/ui/brand';
import { Button } from '@/shared/ui/button';
import { Fonts } from '@/shared/ui/fonts';

/** Distinct token colors; a seat owns one and others can't reuse it. */
const TOKENS = ['#B23A2C', '#1565A8', '#C49A48', '#2E7D5B', '#E07A1F', '#7A4F9A'];
/** Friendly default names, filled in seat order. */
const NAME_POOL = ['An', 'Bình', 'Minh', 'Lan', 'Hùng', 'Mai'];
const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

interface Seat {
  id: string;
  name: string;
  token: string;
}

const makeSeat = (i: number): Seat => ({ id: `p${i + 1}`, name: NAME_POOL[i] ?? '', token: TOKENS[i] });

export default function SetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { start } = useGameActions();

  const [seats, setSeats] = useState<Seat[]>([makeSeat(0), makeSeat(1)]);
  const [rules, setRules] = useState<HouseRules>(() => ({ ...RULE_PRESETS.classic.rules }));

  const usedTokens = (exceptId?: string) =>
    new Set(seats.filter((s) => s.id !== exceptId).map((s) => s.token));

  const addSeat = () => {
    if (seats.length >= MAX_PLAYERS) return;
    const used = usedTokens();
    const token = TOKENS.find((c) => !used.has(c)) ?? TOKENS[seats.length];
    const usedNames = new Set(seats.map((s) => s.name));
    const name = NAME_POOL.find((n) => !usedNames.has(n)) ?? `${t('players')} ${seats.length + 1}`;
    haptics.tap();
    setSeats((prev) => [...prev, { id: `p${Date.now()}`, name, token }]);
  };

  const removeSeat = (id: string) => {
    if (seats.length <= MIN_PLAYERS) return;
    haptics.tap();
    setSeats((prev) => prev.filter((s) => s.id !== id));
  };

  const cycleToken = (id: string) => {
    const used = usedTokens(id);
    haptics.tap();
    setSeats((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const start = TOKENS.indexOf(s.token);
        for (let k = 1; k <= TOKENS.length; k++) {
          const next = TOKENS[(start + k) % TOKENS.length];
          if (!used.has(next)) return { ...s, token: next };
        }
        return s;
      }),
    );
  };

  const setName = (id: string, name: string) =>
    setSeats((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));

  const onStart = () => {
    const players = seats.map((s, i) => ({
      id: s.id,
      name: s.name.trim() || NAME_POOL[i] || `P${i + 1}`,
      token: s.token,
    }));
    start(players, rules);
    router.replace('/game/local');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('setup')}</Text>

        {/* roster */}
        <Text style={styles.sectionLabel}>
          {t('players')} · {seats.length}
        </Text>
        <View style={styles.list}>
          {seats.map((seat) => {
            const initial = seat.name.trim().charAt(0).toUpperCase() || '?';
            return (
              <View key={seat.id} style={styles.row}>
                <Pressable
                  onPress={() => cycleToken(seat.id)}
                  accessibilityRole="button"
                  style={[styles.swatch, { backgroundColor: seat.token }]}
                >
                  <Text style={styles.swatchText}>{initial}</Text>
                </Pressable>
                <TextInput
                  value={seat.name}
                  onChangeText={(v) => setName(seat.id, v)}
                  placeholder={t('playerNamePlaceholder')}
                  placeholderTextColor={Brand.muted}
                  style={styles.nameInput}
                  maxLength={16}
                />
                {seats.length > MIN_PLAYERS && (
                  <Pressable
                    onPress={() => removeSeat(seat.id)}
                    accessibilityRole="button"
                    style={styles.remove}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {seats.length < MAX_PLAYERS && (
            <Pressable onPress={addSeat} accessibilityRole="button" style={styles.addRow}>
              <Text style={styles.addText}>＋ {t('addPlayer')}</Text>
            </Pressable>
          )}
        </View>

        {/* house rules */}
        <Text style={styles.sectionLabel}>{t('houseRules')}</Text>
        <RulesPicker value={rules} onChange={setRules} />

        <View style={styles.actions}>
          <Button label={t('startGame')} onPress={onStart} />
          <Button label={t('backToHome')} variant="outline" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 16 },
  title: { fontFamily: Fonts.display, fontSize: 30, color: Brand.ink },
  sectionLabel: {
    fontFamily: Fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Brand.muted,
    marginTop: 6,
  },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Brand.paper,
    boxShadow: '0 2px 5px rgba(33,28,22,0.25)',
  },
  swatchText: { fontFamily: Fonts.bodyBlack, color: Brand.paper, fontSize: 16 },
  nameInput: { fontFamily: Fonts.bodySemi, flex: 1, fontSize: 16, color: Brand.ink, paddingVertical: 6 },
  remove: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Brand.muted },
  addRow: {
    borderWidth: 1.5,
    borderColor: Brand.line,
    borderStyle: 'dashed',
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Brand.red },
  actions: { gap: 10, marginTop: 8 },
});
