/**
 * House-rule presets — named bundles so players can pick a play style without
 * fiddling with every toggle. Shared by pass-and-play setup and the online lobby
 * (the host's `startGame` takes the same `HouseRules`), so one definition drives
 * both modes.
 *
 * `custom` isn't a preset object — it's the "I'll tune it myself" state, seeded
 * from whichever preset was last selected. Display strings live in i18n.
 */
import { DEFAULT_RULES, type HouseRules } from '@monopoly/engine';

export type PresetId = 'classic' | 'quick' | 'marathon' | 'custom';

export interface RulePreset {
  id: Exclude<PresetId, 'custom'>;
  /** i18n keys for the chip label + one-line description. */
  labelKey: string;
  descKey: string;
  rules: HouseRules;
}

export const RULE_PRESETS: Record<Exclude<PresetId, 'custom'>, RulePreset> = {
  classic: {
    id: 'classic',
    labelKey: 'presetClassic',
    descKey: 'presetClassicDesc',
    rules: { ...DEFAULT_RULES },
  },
  // Cash-rich and lively: bigger bankroll + GO salary, free-parking jackpot on.
  quick: {
    id: 'quick',
    labelKey: 'presetQuick',
    descKey: 'presetQuickDesc',
    rules: {
      startingCash: 20000,
      goSalary: 3000,
      jailFine: 500,
      auctionUnbought: true,
      freeParkingJackpot: true,
    },
  },
  // Tight economy for a long grind: leaner cash, steeper jail fine.
  marathon: {
    id: 'marathon',
    labelKey: 'presetMarathon',
    descKey: 'presetMarathonDesc',
    rules: {
      startingCash: 10000,
      goSalary: 2000,
      jailFine: 1000,
      auctionUnbought: true,
      freeParkingJackpot: false,
    },
  },
};

/** Display order for the preset selector (custom last). */
export const PRESET_ORDER: PresetId[] = ['classic', 'quick', 'marathon', 'custom'];

/** The closest named preset whose rules exactly match `rules`, or `'custom'`. */
export function matchPreset(rules: HouseRules): PresetId {
  for (const preset of Object.values(RULE_PRESETS)) {
    const r = preset.rules;
    if (
      r.startingCash === rules.startingCash &&
      r.goSalary === rules.goSalary &&
      r.jailFine === rules.jailFine &&
      r.auctionUnbought === rules.auctionUnbought &&
      r.freeParkingJackpot === rules.freeParkingJackpot
    ) {
      return preset.id;
    }
  }
  return 'custom';
}
