/**
 * i18next setup. Language resolution order: an explicit saved preference wins;
 * otherwise the device locale (expo-localization) if it's one we support;
 * otherwise Vietnamese (our launch market).
 *
 * Import this module once for its side effect (e.g. in the root layout), then
 * use `useTranslation()` from react-i18next anywhere, or the `setLanguage`
 * helper to switch + persist.
 */
/* eslint-disable import/no-named-as-default-member -- i18next's default export is the configured instance; member calls (use/changeLanguage) are intentional */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { getSavedLanguage, saveLanguage } from '@/services/storage';
import { track } from '@/services/analytics';
import { en } from './resources/en';
import { vi } from './resources/vi';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'vi';

const isSupported = (code: string | null | undefined): code is Language =>
  !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);

/** Device language (e.g. "vi", "en"), if expo-localization can read one. */
function deviceLanguage(): string | null {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
}

function initialLanguage(): Language {
  const saved = getSavedLanguage();
  if (isSupported(saved)) return saved;
  const device = deviceLanguage();
  if (isSupported(device)) return device;
  return DEFAULT_LANGUAGE;
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { vi, en },
    lng: initialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export function setLanguage(lang: Language): void {
  void i18n.changeLanguage(lang);
  saveLanguage(lang);
  track({ name: 'language_changed', language: lang });
}

export function currentLanguage(): Language {
  return (i18n.language as Language) ?? DEFAULT_LANGUAGE;
}

export default i18n;
