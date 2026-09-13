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
