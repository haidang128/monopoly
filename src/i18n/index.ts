/**
 * i18next setup. Vietnamese is the default (our launch market); the saved
 * preference wins if present. Device-locale detection (expo-localization) is
 * wired in the native build — kept out here so the scaffold runs dependency-free.
 *
 * Import this module once for its side effect (e.g. in the root layout), then
 * use `useTranslation()` from react-i18next anywhere, or the `setLanguage`
 * helper to switch + persist.
 */
/* eslint-disable import/no-named-as-default-member -- i18next's default export is the configured instance; member calls (use/changeLanguage) are intentional */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { getSavedLanguage, saveLanguage } from '@/services/storage';
import { track } from '@/services/analytics';
import { en } from './resources/en';
import { vi } from './resources/vi';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'vi';

function initialLanguage(): Language {
  const saved = getSavedLanguage();
  return saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)
    ? (saved as Language)
    : DEFAULT_LANGUAGE;
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
