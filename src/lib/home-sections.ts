// src/lib/home-sections.ts
// 首页栏目选取:置顶文章 / 最新文章 / 最近在看 / 最近在听。
// 纯函数 + 泛型约束(只依赖用到的字段),与 astro:content 解耦,便于单测。

const PINNED_LIMIT = 3;
const LATEST_LIMIT = 3;
const RECENT_LIMIT = 4;

interface ArticleLike {
  data: { pinned?: boolean; pubDate: Date };
}

export function pickPinnedArticles<T extends ArticleLike>(articles: T[]): T[] {
  return articles
    .filter((e) => e.data.pinned === true)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, PINNED_LIMIT);
}

// 最新文章排除置顶:置顶已单列栏目,避免同一篇在首页出现两次
export function pickLatestArticles<T extends ArticleLike>(articles: T[]): T[] {
  return articles
    .filter((e) => e.data.pinned !== true)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, LATEST_LIMIT);
}

// “在看”只保留在看/看完(想看/抛弃不上首页);Bangumi 的 watchedDate 取自最近更新
// 时间,在看中的条目随进度推进自然排前
interface AnimeLike {
  data: { status: 'finished' | 'watching' | 'planned' | 'dropped'; watchedDate?: Date };
}

export function pickRecentAnime<T extends AnimeLike>(anime: T[]): T[] {
  return anime
    .filter((e) => e.data.status === 'watching' || e.data.status === 'finished')
    .sort((a, b) => recencyKey(b.data.watchedDate) - recencyKey(a.data.watchedDate))
    .slice(0, RECENT_LIMIT);
}

interface VocaloidLike {
  data: { status: string; listenedDate?: Date; order?: number };
}

// 排序规则(方案 A:歌单顺序 = 收听顺序):
// 未标日期的条目(网易云同步)按 order(歌单内位置)在前,手动条目无 order 垫底;
// 标了 listenedDate 的条目(手动记录)按日期倒序排在其后。
export function sortVocaloidByRecency<T extends VocaloidLike>(vocaloid: T[]): T[] {
  const undated = vocaloid
    .filter((e) => !e.data.listenedDate)
    .sort(
      (a, b) =>
        (a.data.order ?? Number.POSITIVE_INFINITY) - (b.data.order ?? Number.POSITIVE_INFINITY),
    );
  const dated = vocaloid
    .filter((e) => e.data.listenedDate)
    .sort((a, b) => recencyKey(b.data.listenedDate) - recencyKey(a.data.listenedDate));
  return [...undated, ...dated];
}

// 归档曲目不再出现在“最近在听”
export function pickRecentVocaloid<T extends VocaloidLike>(vocaloid: T[]): T[] {
  return sortVocaloidByRecency(vocaloid.filter((e) => e.data.status !== 'archived')).slice(
    0,
    RECENT_LIMIT,
  );
}

function recencyKey(date?: Date): number {
  return date?.valueOf() ?? Number.NEGATIVE_INFINITY;
}
