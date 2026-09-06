// src/i18n/config.ts
export const locales = ['zh', 'en', 'ru', 'ja'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';
export const uiLocales = locales;
export const contentLocales = ['zh', 'en'] as const;
export type ContentLocale = (typeof contentLocales)[number];
