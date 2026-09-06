// src/i18n/utils.ts
import { defaultLocale, type Locale } from './config';
import zh from './ui/zh';
import en from './ui/en';
import ru from './ui/ru';
import ja from './ui/ja';

const dicts: Record<Locale, Record<string, string>> = { zh, en, ru, ja };

export function t(locale: Locale, key: string, params?: Record<string, string>): string {
  const dict = dicts[locale] ?? {};
  const fallbackDict = dicts[defaultLocale] ?? {};
  const raw = dict[key] ?? fallbackDict[key] ?? key;
  if (params) {
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
      raw,
    );
  }
  return raw;
}

export function getLocalizedPath(pathname: string, targetLocale: Locale): string {
  const stripped = pathname.replace(/^\/(zh|en|ru|ja)(?=\/|$)/, '');
  return `/${targetLocale}${stripped}`;
}

export function getLocaleFromPath(pathname: string): Locale {
  const m = pathname.match(/^\/(zh|en|ru|ja)(?=\/|$)/);
  return (m?.[1] as Locale) ?? defaultLocale;
}
