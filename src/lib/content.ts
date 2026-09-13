// src/lib/content.ts
// 内容数据构建期校验(spec 4.1;Plan 2 计划声称产出但未提供,此处补齐)
export interface OgImageCheckable {
  id: string;
  data: { ogImage?: string; ogImageLocal?: unknown };
}

/** ogImage(远程 URL)与 ogImageLocal(本地图)互斥,同时存在 → build fail(spec 4.2 P1-10 真三选一) */
export function validateOgImageFields(entries: OgImageCheckable[]): void {
  for (const e of entries) {
    if (e.data.ogImage && e.data.ogImageLocal) {
      throw new Error(
        `[validateOgImageFields] ${e.id}: ogImage and ogImageLocal are mutually exclusive (true three-way choice per spec P1-10)`,
      );
    }
  }
}

export interface ItemWithId {
  id: string;
}

/** JSON collection item.id 在 collection 内唯一(spec 4.1 P1-2);由 file() parser 桥接处调用 */
export function validateCollectionItemIds(collection: string, items: ItemWithId[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error(`[validateCollectionItemIds] ${collection}: item missing required "id"`);
    }
    if (seen.has(item.id)) {
      throw new Error(`[validateCollectionItemIds] ${collection}: duplicate item id "${item.id}"`);
    }
    seen.add(item.id);
  }
}

// === Bangumi 同步数据 + 本地手记合并 ===
// anime.json 由 src/scripts/sync-bangumi.mjs 生成;anime-notes.json 手写。
// note.comment 优先于 bgm 短评(bgm 上不想写的私房话留站内),highlight 只存在于 note。

export interface AnimeNote {
  bangumiId?: unknown;
  comment?: unknown;
  highlight?: unknown;
}

// Record 交叉保证 loader 里可直接传给 parseData(data: Record<string, unknown>)
export type AnimeMergable = { id: string } & Record<string, unknown>;

export function mergeAnimeNotes<T extends AnimeMergable>(
  items: T[],
  notes: AnimeNote[],
): { items: T[]; unmatchedNotes: AnimeNote[] } {
  const noteById = new Map<string, AnimeNote>();
  for (const note of notes) {
    if (
      typeof note.bangumiId !== 'number' ||
      !Number.isInteger(note.bangumiId) ||
      note.bangumiId <= 0
    ) {
      throw new Error(
        `[mergeAnimeNotes] anime-notes.json: bangumiId 必须为正整数,得到 ${JSON.stringify(note)}`,
      );
    }
    if (noteById.has(`bgm-${note.bangumiId}`)) {
      throw new Error(`[mergeAnimeNotes] anime-notes.json: bangumiId=${note.bangumiId} 重复`);
    }
    noteById.set(`bgm-${note.bangumiId}`, note);
  }
  const merged = items.map((item) => {
    const note = noteById.get(item.id);
    if (!note) return item;
    const noteComment = typeof note.comment === 'string' ? note.comment.trim() : undefined;
    return {
      ...item,
      comment: noteComment || (typeof item.comment === 'string' ? item.comment : undefined),
      highlight:
        typeof note.highlight === 'boolean'
          ? note.highlight
          : typeof item.highlight === 'boolean'
            ? item.highlight
            : false,
    };
  });
  const itemIds = new Set(items.map((i) => i.id));
  const unmatchedNotes = notes.filter((n) => !itemIds.has(`bgm-${n.bangumiId}`));
  return { items: merged, unmatchedNotes };
}

// === 网易云同步数据 + 手动条目 + 本地手记合并 ===
// vocaloid.json 由 src/scripts/sync-vocaloid.mjs 生成;vocaloid-manual.json(不在网易云的
// 曲目)与 vocaloid-notes.json 手写。note 按 item.id 叠加:评分/感想/歌词片段/状态/重点,
// 未给出的字段保留自动值;highlight 只存在于 note。

export interface VocaloidNote {
  id?: unknown;
  status?: unknown;
  score?: unknown;
  comment?: unknown;
  lyricSnippet?: unknown;
  highlight?: unknown;
  producer?: unknown;
  vocaloid?: unknown;
}

const VOCALOID_STATUSES = new Set(['favorite', 'liked', 'neutral', 'archived']);

export function mergeVocaloidNotes<T extends AnimeMergable>(
  items: T[],
  notes: VocaloidNote[],
): { items: T[]; unmatchedNotes: VocaloidNote[] } {
  const noteById = new Map<string, VocaloidNote>();
  for (const note of notes) {
    if (typeof note.id !== 'string' || note.id.trim() === '') {
      throw new Error(
        `[mergeVocaloidNotes] vocaloid-notes.json: id 必须为非空字符串,得到 ${JSON.stringify(note)}`,
      );
    }
    if (noteById.has(note.id)) {
      throw new Error(`[mergeVocaloidNotes] vocaloid-notes.json: id="${note.id}" 重复`);
    }
    if (
      note.status != null &&
      (typeof note.status !== 'string' || !VOCALOID_STATUSES.has(note.status))
    ) {
      throw new Error(
        `[mergeVocaloidNotes] vocaloid-notes.json: id="${note.id}" status 必须是 favorite/liked/neutral/archived`,
      );
    }
    noteById.set(note.id, note);
  }
  const merged = items.map((item) => {
    const note = noteById.get(item.id);
    if (!note) return item;
    const noteComment = typeof note.comment === 'string' ? note.comment.trim() : undefined;
    const noteVocaloid = Array.isArray(note.vocaloid)
      ? note.vocaloid.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      : undefined;
    return {
      ...item,
      status: typeof note.status === 'string' ? note.status : item.status,
      score: typeof note.score === 'number' ? note.score : item.score,
      producer:
        typeof note.producer === 'string' && note.producer.trim() !== ''
          ? note.producer.trim()
          : item.producer,
      vocaloid: noteVocaloid ?? item.vocaloid,
      lyricSnippet:
        typeof note.lyricSnippet === 'string' && note.lyricSnippet.trim() !== ''
          ? note.lyricSnippet
          : item.lyricSnippet,
      comment: noteComment || (typeof item.comment === 'string' ? item.comment : undefined),
      highlight:
        typeof note.highlight === 'boolean'
          ? note.highlight
          : typeof item.highlight === 'boolean'
            ? item.highlight
            : false,
    };
  });
  const itemIds = new Set(items.map((i) => i.id));
  const unmatchedNotes = notes.filter((n) => !itemIds.has(n.id as string));
  return { items: merged, unmatchedNotes };
}
