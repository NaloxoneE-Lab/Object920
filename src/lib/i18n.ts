// src/lib/i18n.ts
// 双语渐进解析 + 构建期校验函数族(spec 4.1/6.5)
import type { Locale, ContentLocale } from '@i18n/config';

export interface TranslationGroup<T = unknown> {
  zh?: T;
  en?: T;
}

export type EntryResolutionMode = 'render' | 'placeholder' | 'skip';

export interface ResolvedEntry<T = unknown> {
  mode: EntryResolutionMode;
  uiLocale: Locale;
  contentLocale: ContentLocale;
  entry?: T;
}

interface IdLike {
  id: string;
  data: { translationKey?: string };
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function localeFromEntryId(id: string): ContentLocale {
  const seg = id.split('/')[0];
  if (seg === 'zh' || seg === 'en') return seg;
  throw new Error(`Unexpected locale segment in entry id: ${id}`);
}

export function slugOf<T extends { id: string }>(entry: T): string {
  return entry.id.slice(entry.id.indexOf('/') + 1);
}

export function getEntriesGroupedByTranslationKey<T extends IdLike>(
  entries: T[],
): Map<string, TranslationGroup<T>> {
  const groups = new Map<string, TranslationGroup<T>>();
  for (const entry of entries) {
    const key = entry.data.translationKey ?? `single:${entry.id}`;
    const locale = localeFromEntryId(entry.id);
    let group = groups.get(key);
    if (!group) {
      group = {};
      groups.set(key, group);
    }
    group[locale] = entry;
  }
  return groups;
}

export function resolveLocalizedEntry<T>(
  group: TranslationGroup<T>,
  uiLocale: Locale,
): ResolvedEntry<T> {
  const { zh, en } = group;
  if (uiLocale === 'zh') {
    if (zh) return { mode: 'render', uiLocale, contentLocale: 'zh', entry: zh };
    if (en) return { mode: 'placeholder', uiLocale, contentLocale: 'en' };
    return { mode: 'skip', uiLocale, contentLocale: 'zh' };
  }
  if (uiLocale === 'en') {
    if (en) return { mode: 'render', uiLocale, contentLocale: 'en', entry: en };
    if (zh) return { mode: 'placeholder', uiLocale, contentLocale: 'zh' };
    return { mode: 'skip', uiLocale, contentLocale: 'en' };
  }
  if (zh) return { mode: 'placeholder', uiLocale, contentLocale: 'zh' };
  if (en) return { mode: 'placeholder', uiLocale, contentLocale: 'en' };
  return { mode: 'skip', uiLocale, contentLocale: 'zh' };
}

export function getLocalizedEntryPath<T extends { id: string }>(
  group: TranslationGroup<T>,
  targetLocale: Locale,
  routeSegment: string,
): string | null {
  if (targetLocale === 'zh' && group.zh) return `/zh/${routeSegment}/${slugOf(group.zh)}/`;
  if (targetLocale === 'en' && group.en) return `/en/${routeSegment}/${slugOf(group.en)}/`;
  const existing = group.zh ?? group.en;
  if (!existing) return null;
  return `/${targetLocale}/${routeSegment}/${slugOf(existing)}/`;
}

// === 构建期校验函数族(spec 4.1/6.5,所有冲突直接 build fail)===

/** 从 entry 相对路径推导 locale(`articles/zh/foo` → zh);locale 唯一真相 = 目录,无 frontmatter lang */
export function deriveLocaleFromPath(path: string): ContentLocale {
  const segs = path.split('/');
  if (segs.length < 2) {
    throw new Error(`Invalid content path (expected {collection}/{locale}/{slug}): ${path}`);
  }
  const locale = segs[1];
  if (locale !== 'zh' && locale !== 'en') {
    throw new Error(`Invalid content locale in path: ${path}`);
  }
  return locale;
}

interface SlugCheckable {
  collection: string;
  id: string; // {locale}/{slug}
}

/** 目录名合法性(ASCII slug)+ invariant unique(collection, locale, slug);跨 collection 同名合法 */
export function validateSlugs(entries: SlugCheckable[]): void {
  const seen = new Map<string, string>();
  for (const e of entries) {
    const [locale, ...rest] = e.id.split('/');
    const slug = rest.join('/');
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(
        `[validateSlugs] Invalid slug "${slug}" in ${e.collection}/${e.id} (must match ${SLUG_PATTERN.source})`,
      );
    }
    const key = `${e.collection}/${locale}/${slug}`;
    if (seen.has(key)) {
      throw new Error(`[validateSlugs] Duplicate slug in ${key}`);
    }
    seen.set(key, e.id);
  }
}

interface TranslationCheckable {
  collection: string;
  id: string; // {locale}/{slug}
  data: { translationKey?: string };
}

/** 同 collection + translationKey + locale 最多 1 条(重复 → build fail);无 translationKey 的合成组不参与 */
export function validateTranslationGroups(entries: TranslationCheckable[]): void {
  const seen = new Map<string, string>();
  for (const e of entries) {
    const key = e.data.translationKey;
    if (!key || !key.trim()) continue;
    const locale = e.id.split('/')[0];
    const dedupe = `${e.collection}/${key}/${locale}`;
    if (seen.has(dedupe)) {
      throw new Error(
        `[validateTranslationGroups] Duplicate translationKey "${key}" for locale "${locale}" in ${e.collection}: ${seen.get(dedupe)} vs ${e.id}`,
      );
    }
    seen.set(dedupe, e.id);
  }
}
