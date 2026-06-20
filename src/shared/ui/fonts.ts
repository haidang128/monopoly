/**
 * Typography — the three design typefaces (loaded at the root via `useFonts`).
 *
 * Custom fonts in RN are per-weight families (the `fontWeight` style prop is
 * ignored once `fontFamily` is set on native), so each role maps to a specific
 * loaded family rather than a family + weight pair:
 *   • Playfair Display — display serif (titles, logo, card names, prices)
 *   • Be Vietnam Pro   — UI/body sans (tile names, buttons, most text)
 *   • IBM Plex Mono    — mono labels (uppercase eyebrows, tags, eyelets)
 *
 * The `fontMap` is passed straight to `useFonts`; the string keys become the
 * `fontFamily` values referenced through `Fonts`.
 */
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';

/** Map handed to `useFonts` at the app root. */
export const fontMap = {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_900Black,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} as const;

/** Semantic font-family roles. Use as `fontFamily: Fonts.display`. */
export const Fonts = {
  // Playfair Display
  displaySemi: 'PlayfairDisplay_600SemiBold',
  displayBold: 'PlayfairDisplay_700Bold',
  display: 'PlayfairDisplay_800ExtraBold',
  displayBlack: 'PlayfairDisplay_900Black',
  // Be Vietnam Pro
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemi: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
  bodyBlack: 'BeVietnamPro_800ExtraBold',
  // IBM Plex Mono
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;
