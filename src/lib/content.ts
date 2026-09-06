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
