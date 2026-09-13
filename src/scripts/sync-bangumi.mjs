// src/scripts/sync-bangumi.mjs
// 从番组计划(Bangumi)公开 API 拉取动画收藏,生成 src/content/data/anime.json 并下载封面到 covers/。
// data/anime.json 从此为 AUTO-GENERATED:个人手记(短评/重点标记)在 data/anime-notes.json,
// 由 content.config.ts 的 loader 在构建期合并,不要通过 Sveltia 或手改本文件。
//
// 用法:node src/scripts/sync-bangumi.mjs [--force]
//   BANGUMI_USER  必填,Bangumi 主页 URL(bgm.tv/user/xxx)中 xxx 一段:
//                 设置过自定义 URL 的是用户名,否则是数字 ID(昵称 ≠ 用户名,API 按 URL slug 查询)
//   --force       重新下载已存在的封面(bgm 换封面图时用)
// 本地直连 bgm.tv 被墙/抖动时走代理(Node fetch 默认不读代理环境变量,需 NODE_USE_ENV_PROXY=1):
//   HTTPS_PROXY=http://127.0.0.1:7890 NODE_USE_ENV_PROXY=1 pnpm sync:anime
// CI(GitHub runner)境外网络,无需代理。
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const API_BASE = 'https://api.bgm.tv';
const UA = 'Object920/anime-sync (https://github.com/NaloxoneE-Lab/Object920)';
const PAGE_LIMIT = 50; // 单页条数,服务端上限内
const REQUEST_DELAY_MS = 600; // 官方限流要求,页间/封面下载间隔
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const MAX_ITEMS = Number(process.env.SYNC_MAX_ITEMS ?? 0) || Infinity; // 测试用:限制同步条数

const dataDir = resolve(process.env.BANGUMI_DATA_DIR ?? 'src/content/data');
const coversDir = join(dataDir, 'covers');
const user = process.env.BANGUMI_USER?.trim();
const force = process.argv.includes('--force');

if (!user) {
  console.error(
    '[sync-bangumi] 缺少 BANGUMI_USER。打开 bgm.tv 个人主页(头像 → 我的空间),取 URL ' +
      'bgm.tv/user/<这一段> 填入 .env 的 BANGUMI_USER;若从未设置过自定义 URL,这段是数字 ID。',
  );
  process.exit(1);
}

async function apiFetch(path) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      if (res.status === 404) {
        // 404 是确定性错误,重试无意义:URL slug 拼错或用户不存在
        throw new Error(
          `Bangumi 返回 404(${path}):用户 "${user}" 不存在。注意 BANGUMI_USER 必须是主页 URL 中的 ` +
            `URL slug(或数字 ID),不是站内昵称。`,
        );
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
      return await res.json();
    } catch (err) {
      if (err.message.includes('404')) throw err;
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        console.warn(
          `[sync-bangumi] ${err.message},重试 ${attempt + 1}/${RETRY_DELAYS_MS.length}...`,
        );
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastErr;
}

async function fetchAllCollections() {
  const items = [];
  let offset = 0;
  for (;;) {
    const page = await apiFetch(
      `/v0/users/${user}/collections?subject_type=2&limit=${PAGE_LIMIT}&offset=${offset}`,
    );
    items.push(...page.data);
    if (items.length >= Math.min(page.total, MAX_ITEMS) || page.data.length === 0) return items;
    offset += PAGE_LIMIT;
    await sleep(REQUEST_DELAY_MS);
  }
}

// 收藏状态 type:1=wish 想看 2=collect 看过 3=doing 在看 4=on_hold 搁置 5=dropped 抛弃
// 站点 schema 只有 4 档:搁置就近归入 watching(还在坑里)
const STATUS_MAP = { 1: 'planned', 2: 'finished', 3: 'watching', 4: 'watching', 5: 'dropped' };

function mapItem(coll) {
  const s = coll.subject;
  const nameCn = s.name_cn?.trim() || undefined;
  const name = s.name?.trim();
  return {
    id: `bgm-${coll.subject_id}`,
    bangumiId: coll.subject_id,
    title: nameCn || name,
    titleOriginal: nameCn && nameCn !== name ? name : undefined,
    titleZh: nameCn,
    cover: `covers/${coll.subject_id}.jpg`,
    // 评分只取个人打分;未打分不显示,不用 bgm 公开评分兜底
    score: coll.rate > 0 ? coll.rate : undefined,
    status: STATUS_MAP[coll.type] ?? 'planned',
    watchedDate: coll.updated_at?.slice(0, 10),
    tags: coll.tags ?? [],
    episodes: s.eps > 0 ? s.eps : undefined,
    episodesWatched: coll.ep_status > 0 ? coll.ep_status : undefined,
    year: s.date ? Number(s.date.slice(0, 4)) || undefined : undefined,
    source: `https://bgm.tv/subject/${coll.subject_id}`,
    comment: coll.comment?.trim() || undefined,
    highlight: false,
  };
}

async function downloadCover(subjectId) {
  const dest = join(coversDir, `${subjectId}.jpg`);
  if (existsSync(dest) && statSync(dest).size > 0 && !force) return true;
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const subject = await apiFetch(`/v0/subjects/${subjectId}`);
      const url = subject.images?.common ?? subject.images?.medium ?? subject.images?.large;
      if (!url) throw new Error(`subject ${subjectId} 无封面`);
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`封面下载 HTTP ${res.status}: ${url}`);
      writeFileSync(dest, new Uint8Array(await res.arrayBuffer()));
      return true;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        console.warn(
          `[sync-bangumi] ${err.message},重试 ${attempt + 1}/${RETRY_DELAYS_MS.length}...`,
        );
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  console.error(`[sync-bangumi] 封面下载失败(该条目将不带封面): ${lastErr.message}`);
  return false;
}

// 主逻辑
mkdirSync(coversDir, { recursive: true });
console.log(`[sync-bangumi] 拉取 ${user} 的动画收藏...`);
const collections = (await fetchAllCollections()).slice(0, MAX_ITEMS);
console.log(`[sync-bangumi] 共 ${collections.length} 条收藏`);

const items = [];
for (const [i, coll] of collections.entries()) {
  const mapped = mapItem(coll);
  if (!(await downloadCover(coll.subject_id))) mapped.cover = undefined;
  items.push(mapped);
  if ((i + 1) % 10 === 0) console.log(`[sync-bangumi] 进度 ${i + 1}/${collections.length}`);
  await sleep(REQUEST_DELAY_MS);
}

// 清理已被取消收藏的条目的孤儿封面
const keptIds = new Set(items.map((it) => it.bangumiId));
for (const f of readdirSync(coversDir)) {
  const sid = Number(f.replace(/\.jpg$/, ''));
  if (!keptIds.has(sid)) {
    rmSync(join(coversDir, f));
    console.log(`[sync-bangumi] 移除孤儿封面 ${f}`);
  }
}

const generated = {
  _meta: {
    generator: 'sync-bangumi.mjs',
    bangumiUser: user,
    syncedAt: new Date().toISOString().slice(0, 10),
    note: 'AUTO-GENERATED,勿手改;个人短评/重点标记写 anime-notes.json',
  },
  items,
};
writeFileSync(join(dataDir, 'anime.json'), JSON.stringify(generated, null, 2) + '\n');
console.log(`[sync-bangumi] 已写入 ${join(dataDir, 'anime.json')}(${items.length} 条)`);
