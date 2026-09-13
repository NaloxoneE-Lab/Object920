// src/scripts/sync-vocaloid.mjs
// 从网易云音乐公开歌单拉取曲目,生成 src/content/data/vocaloid.json 并下载封面到 covers/。
// data/vocaloid.json 从此为 AUTO-GENERATED:个人手记(评分/感想/歌词片段/重点/状态修正)写
// data/vocaloid-notes.json,不在网易云的曲目写 data/vocaloid-manual.json,
// 由 content.config.ts 的 loader 在构建期合并,不要通过 Sveltia 或手改本文件。
//
// 用法:node src/scripts/sync-vocaloid.mjs [--force]
//   NETEASE_PLAYLIST_ID  必填,歌单 ID:网页版打开歌单,取 URL music.163.com/#/playlist?id=<这一段>
//                        填入 .env;歌单需设为公开(隐私歌单匿名接口拿不到)
//   --force              重新下载已存在的封面
// 歌单里的曲目顺序 = 站点展示顺序(“最近在听”按此排序,把新听的拖到歌单最前即可)。
// 封面隔离在 covers/vocaloid/ 子目录:番剧管线同用 covers/,纯数字文件名互相撞车,
// 孤儿清理绝不能扫到对方的文件。
// 网易云接口是网页版公开端点(非官方开放 API):失败时保留上次生成的 JSON,不阻塞构建;
// 上游若失效,官方开放平台(developer.music.163.com)个人入驻后可切官方接口。
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { splitVocaloidArtists } from './vocaloid-artists.mjs';

const PLAYLIST_API = 'https://music.163.com/api/playlist/detail';
const UA = 'Object920/vocaloid-sync (https://github.com/NaloxoneE-Lab/Object920)';
const REQUEST_DELAY_MS = 300; // 无官方限流要求,礼貌间隔
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const MAX_ITEMS = Number(process.env.SYNC_MAX_ITEMS ?? 0) || Infinity; // 测试用:限制同步条数

const dataDir = resolve(process.env.VOCALOID_DATA_DIR ?? 'src/content/data');
// 番剧管线同用 data/covers/ 且清理逻辑按纯数字文件名匹配,术曲封面必须隔离到子目录
const coversDir = join(dataDir, 'covers', 'vocaloid');
const playlistId = process.env.NETEASE_PLAYLIST_ID?.trim();
const force = process.argv.includes('--force');

if (!playlistId || !/^\d+$/.test(playlistId)) {
  console.error(
    '[sync-vocaloid] 缺少 NETEASE_PLAYLIST_ID。网易云网页版打开歌单,取 URL ' +
      'music.163.com/#/playlist?id=<这一段> 填入 .env;歌单需设为公开。',
  );
  process.exit(1);
}

async function fetchWithRetry(url, describe) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: 'https://music.163.com', Cookie: 'appver=2.9.7' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${describe}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        console.warn(
          `[sync-vocaloid] ${err.message},重试 ${attempt + 1}/${RETRY_DELAYS_MS.length}...`,
        );
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastErr;
}

async function downloadCover(songId, picUrl) {
  const dest = join(coversDir, `${songId}.jpg`);
  if (existsSync(dest) && statSync(dest).size > 0 && !force) return true;
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      if (!picUrl) throw new Error(`song ${songId} 无封面 URL`);
      // CDN 是 http 链接且支持 param 裁剪;强制 https 并取 500px
      const res = await fetch(`${picUrl.replace(/^http:/, 'https:')}?param=500y500`, {
        headers: { 'User-Agent': UA, Referer: 'https://music.163.com' },
      });
      if (!res.ok) throw new Error(`封面下载 HTTP ${res.status}: ${picUrl}`);
      writeFileSync(dest, new Uint8Array(await res.arrayBuffer()));
      return true;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        console.warn(
          `[sync-vocaloid] ${err.message},重试 ${attempt + 1}/${RETRY_DELAYS_MS.length}...`,
        );
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  console.error(`[sync-vocaloid] 封面下载失败(该条目将不带封面): ${lastErr.message}`);
  return false;
}

// 主逻辑
mkdirSync(coversDir, { recursive: true });
console.log(`[sync-vocaloid] 拉取歌单 ${playlistId}...`);
const payload = await fetchWithRetry(`${PLAYLIST_API}?id=${playlistId}`, '歌单详情');
if (payload.code !== 200 || !payload.result?.tracks) {
  throw new Error(
    `[sync-vocaloid] 歌单 ${playlistId} 不存在、已删除或为隐私歌单(匿名接口只能读公开歌单)`,
  );
}
const tracks = payload.result.tracks.slice(0, MAX_ITEMS);
console.log(
  `[sync-vocaloid] 歌单「${payload.result.name}」共 ${payload.result.trackCount} 首,本次同步 ${tracks.length} 首`,
);

// 同一首歌在歌单里出现两次时保留靠前的(靠前 = 最近添加意图)
const seen = new Set();
const items = [];
for (const [i, t] of tracks.entries()) {
  if (seen.has(t.id)) continue;
  seen.add(t.id);
  const { producer, vocaloid } = splitVocaloidArtists((t.artists ?? []).map((a) => a?.name));
  const publishYear = t.album?.publishTime ? new Date(t.album.publishTime).getUTCFullYear() : NaN;
  const item = {
    id: `ne-${t.id}`,
    neteaseId: t.id,
    title: t.name,
    producer,
    vocaloid,
    cover: `covers/vocaloid/${t.id}.jpg`,
    status: 'liked',
    order: items.length,
    tags: [],
    year: Number.isInteger(publishYear) ? publishYear : undefined,
    platform: [{ name: '网易云', url: `https://music.163.com/#/song?id=${t.id}` }],
    highlight: false,
  };
  if (!(await downloadCover(t.id, t.album?.picUrl))) item.cover = undefined;
  items.push(item);
  if ((i + 1) % 10 === 0) console.log(`[sync-vocaloid] 进度 ${i + 1}/${tracks.length}`);
  await sleep(REQUEST_DELAY_MS);
}

// 清理已移出歌单条目的孤儿封面:只清纯数字命名(同步条目),手写 manual 封面不动
const keptIds = new Set(items.map((it) => it.neteaseId));
for (const f of readdirSync(coversDir)) {
  const m = f.match(/^(\d+)\.jpg$/);
  if (m && !keptIds.has(Number(m[1]))) {
    rmSync(join(coversDir, f));
    console.log(`[sync-vocaloid] 移除孤儿封面 covers/vocaloid/${f}`);
  }
}

const generated = {
  _meta: {
    generator: 'sync-vocaloid.mjs',
    neteasePlaylistId: playlistId,
    playlistName: payload.result.name,
    syncedAt: new Date().toISOString().slice(0, 10),
    note: 'AUTO-GENERATED,勿手改;手记写 vocaloid-notes.json,站外曲目写 vocaloid-manual.json',
  },
  items,
};
writeFileSync(join(dataDir, 'vocaloid.json'), JSON.stringify(generated, null, 2) + '\n');
console.log(`[sync-vocaloid] 已写入 ${join(dataDir, 'vocaloid.json')}(${items.length} 条)`);
