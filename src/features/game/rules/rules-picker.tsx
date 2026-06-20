/**
 * House-rule picker: a row of preset chips over the detailed controls. Picking a
 * named preset overwrites all rules; editing any control drops you to "Custom"
 * (derived via {@link matchPreset}, so no separate selection state to keep in
 * sync). Fully controlled — the parent owns the `HouseRules` value.
 */
import { type HouseRules } from '@monopoly/engine';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { haptics } from '@/services/haptics';
import { formatDong } from '@/shared/lib/format';
import { Brand } from '@/shared/ui/brand';
import { Fonts } from '@/shared/ui/fonts';

import { matchPreset, PRESET_ORDER, RULE_PRESETS, type PresetId } from './presets';

const CASH_PRESETS = [10000, 15000, 20000];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function RulesPicker({
  value,
  onChange,
}: {
  value: HouseRules;
  onChange: (rules: HouseRules) => void;
}) {
  const { t } = useTranslation();
  const selected = matchPreset(value);

  const selectPreset = (id: PresetId) => {
    if (id === 'custom') return; // Custom is reached by editing a control, not picked.
    haptics.tap();
    onChange({ ...RULE_PRESETS[id].rules });
  };
  const patch = (p: Partial<HouseRules>) => {
    haptics.tap();
    onChange({ ...value, ...p });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.presets}>
        {PRESET_ORDER.map((id) => {
          const active = selected === id;
          const label = id === 'custom' ? t('presetCustom') : t(RULE_PRESETS[id].labelKey);
          return (
            <Pressable
              key={id}
              onPress={() => selectPreset(id)}
              disabled={id === 'custom'}
              accessibilityRole="button"
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.desc}>
        {selected === 'custom' ? t('presetCustomDesc') : t(RULE_PRESETS[selected].descKey)}
      </Text>

      <View style={styles.card}>
        <Text style={styles.ruleName}>{t('startingCash')}</Text>
        <View style={styles.segment}>
          {CASH_PRESETS.map((amount) => {
            const active = amount === value.startingCash;
            return (
              <Pressable
                key={amount}
                onPress={() => patch({ startingCash: amount })}
                accessibilityRole="button"
                style={[styles.segItem, active && styles.segItemActive]}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{formatDong(amount)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Stepper
          label={t('goSalary')}
          display={formatDong(value.goSalary)}
          onDec={() => patch({ goSalary: clamp(value.goSalary - 500, 0, 5000) })}
          onInc={() => patch({ goSalary: clamp(value.goSalary + 500, 0, 5000) })}
        />
        <Stepper
          label={t('jailFine')}
          display={formatDong(value.jailFine)}
          onDec={() => patch({ jailFine: clamp(value.jailFine - 100, 0, 2000) })}
          onInc={() => patch({ jailFine: clamp(value.jailFine + 100, 0, 2000) })}
        />

        <View style={styles.divider} />
        <View style={styles.toggleRow}>
          <Text style={styles.ruleName}>{t('auctionRule')}</Text>
          <Switch
            value={value.auctionUnbought}
            onValueChange={(v) => patch({ auctionUnbought: v })}
            trackColor={{ true: Brand.green, false: Brand.line }}
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.ruleName}>{t('freeParkingRule')}</Text>
          <Switch
            value={value.freeParkingJackpot}
            onValueChange={(v) => patch({ freeParkingJackpot: v })}
            trackColor={{ true: Brand.green, false: Brand.line }}
          />
        </View>
      </View>
    </View>
  );
}

function Stepper({
  label,
  display,
  onDec,
  onInc,
}: {
  label: string;
  display: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.ruleName}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={onDec} accessibilityRole="button" style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepVal}>{display}</Text>
        <Pressable onPress={onInc} accessibilityRole="button" style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.paper,
  },
  chipActive: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  chipText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Brand.muted },
  chipTextActive: { color: Brand.paper },
  desc: { fontFamily: Fonts.body, fontSize: 12, color: Brand.muted },
  card: {
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    gap: 12,
  },
  ruleName: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Brand.ink, flexShrink: 1 },
  segment: {
    flexDirection: 'row',
    backgroundColor: Brand.sand,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 4,
    gap: 4,
  },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segItemActive: { backgroundColor: Brand.ink },
  segText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Brand.muted },
  segTextActive: { color: Brand.paper },
  divider: { height: 1, backgroundColor: Brand.line },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Brand.ink },
  stepVal: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Brand.ink, minWidth: 72, textAlign: 'center' },
});
