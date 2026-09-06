// src/lib/seo.ts
import type { Locale } from '@i18n/config';

export interface HreflangAlternate {
  locale: Locale;
  url: string;
}

const HREFLANG_CODES: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
  ru: 'ru',
  ja: 'ja',
};

export function hreflangCode(locale: Locale): string {
  return HREFLANG_CODES[locale];
}

export function pickXDefault(
  alternates: HreflangAlternate[],
  defaultLocale: Locale,
): Locale | null {
  if (alternates.some((a) => a.locale === defaultLocale)) return defaultLocale;
  return alternates[0]?.locale ?? null;
}

export function buildHreflang(
  alternates: HreflangAlternate[],
  xDefaultLocale: Locale | null,
): string {
  const tags: string[] = alternates.map(
    (a) => `<link rel="alternate" hreflang="${hreflangCode(a.locale)}" href="${a.url}" />`,
  );
  if (xDefaultLocale) {
    const xd = alternates.find((a) => a.locale === xDefaultLocale);
    if (xd) tags.push(`<link rel="alternate" hreflang="x-default" href="${xd.url}" />`);
  }
  return tags.join('\n');
}
