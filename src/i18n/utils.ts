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
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/** 卡片元信息用的纯数字日期(2026-10-04):本地时间字段拼装,避免 toISOString 的 UTC 偏移 */
export function formatDateISO(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}
