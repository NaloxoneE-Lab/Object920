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
// 大歌单注意:老接口 api/playlist/detail 对大歌单只回前 10 首(截断视图),
// 必须 v6 拿完整 trackIds(有序)再批量 v3 song detail 补全曲名/歌手/封面。
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { splitVocaloidArtists } from './vocaloid-artists.mjs';

const PLAYLIST_API = 'https://music.163.com/api/v6/playlist/detail';
const SONG_DETAIL_API = 'https://music.163.com/api/v3/song/detail';
const SONG_DETAIL_BATCH = 100; // v3 song detail 单批 id 数(URL 长度与响应体折中)
const UA = 'Object920/vocaloid-sync (https://github.com/NaloxoneE-Lab/Object920)';
const REQUEST_DELAY_MS = 300; // 无官方限流要求,礼貌间隔
const REQUEST_TIMEOUT_MS = 15000; // 单请求超时:网易云偶发挂连接,无超时会永久卡死同步
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

async function fetchWithRetry(url, describe, init) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Referer: 'https://music.163.com', Cookie: 'appver=2.9.7' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...init,
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

// v6 匿名只回前 10 首 tracks,但 trackIds 是全量且按歌单顺序;
// 曲名/歌手/封面用 v3 song detail 按批补全
async function fetchPlaylist(playlistId) {
  const payload = await fetchWithRetry(`${PLAYLIST_API}?id=${playlistId}&n=1000`, '歌单详情', {
    method: 'POST',
  });
  const playlist = payload.playlist ?? payload.result;
  if (payload.code !== 200 || !playlist?.trackIds?.length) {
    throw new Error(
      `[sync-vocaloid] 歌单 ${playlistId} 不存在、已删除或为隐私歌单(匿名接口只能读公开歌单)`,
    );
  }
  const trackIds = playlist.trackIds.map((t) => t.id);
  const detailMap = new Map();
  for (let i = 0; i < trackIds.length; i += SONG_DETAIL_BATCH) {
    const batch = trackIds.slice(i, i + SONG_DETAIL_BATCH);
    const c = JSON.stringify(batch.map((id) => ({ id })));
    const detail = await fetchWithRetry(
      `${SONG_DETAIL_API}?c=${encodeURIComponent(c)}`,
      '歌曲详情',
    );
    for (const song of detail.songs ?? []) detailMap.set(song.id, song);
    if (i + SONG_DETAIL_BATCH < trackIds.length) await sleep(REQUEST_DELAY_MS);
  }
  const missing = trackIds.filter((id) => !detailMap.has(id));
  if (missing.length > 0) {
    console.warn(
      `[sync-vocaloid] ${missing.length} 首在详情接口缺失(疑似下架/灰歌),跳过: ${missing.join(',')}`,
    );
  }
  // 网易对高频请求会随机返回缺 al/ar 的稀疏对象(反爬降级):逐条补拉,
  // 单条请求实测字段完整;限量 50 防止接口持续降级时无限循环
  const sparse = trackIds.filter((id) => {
    const s = detailMap.get(id);
    return s && !(s.al ?? s.album) && !(s.ar ?? s.artists);
  });
  if (sparse.length > 0) {
    console.warn(`[sync-vocaloid] ${sparse.length} 首返回稀疏字段,逐条补拉...`);
    for (const id of sparse.slice(0, 50)) {
      await sleep(REQUEST_DELAY_MS);
      const one = await fetchWithRetry(
        `${SONG_DETAIL_API}?c=${encodeURIComponent(JSON.stringify([{ id }]))}`,
        '歌曲详情补拉',
      );
      const s = (one.songs ?? [])[0];
      if (s && ((s.al ?? s.album)?.picUrl || (s.ar ?? s.artists)?.length)) detailMap.set(id, s);
    }
  }
  return { playlist, tracks: trackIds.map((id) => detailMap.get(id)).filter(Boolean) };
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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
const { playlist, tracks } = await fetchPlaylist(playlistId);
if (tracks.length === 0) {
  throw new Error(`[sync-vocaloid] 歌单 ${playlistId} 没有可同步的曲目`);
}
console.log(
  `[sync-vocaloid] 歌单「${playlist.name}」共 ${playlist.trackCount} 首,本次同步 ${tracks.length} 首`,
);

// 同一首歌在歌单里出现两次时保留靠前的(靠前 = 最近添加意图)
const seen = new Set();
const items = [];
// v3 song detail 用新字段名 al/ar;老字段 album/artists 兜底(接口若回退形态)
const albumOf = (t) => t.album ?? t.al ?? {};
const artistsOf = (t) => t.artists ?? t.ar ?? [];
for (const [i, t] of tracks.slice(0, MAX_ITEMS).entries()) {
  if (seen.has(t.id)) continue;
  seen.add(t.id);
  const album = albumOf(t);
  const { producer, vocaloid } = splitVocaloidArtists(artistsOf(t).map((a) => a?.name));
  const publishYear = album.publishTime ? new Date(album.publishTime).getUTCFullYear() : NaN;
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
  if (!(await downloadCover(t.id, album.picUrl))) item.cover = undefined;
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
    playlistName: playlist.name,
    syncedAt: new Date().toISOString().slice(0, 10),
    note: 'AUTO-GENERATED,勿手改;手记写 vocaloid-notes.json,站外曲目写 vocaloid-manual.json',
  },
  items,
};
writeFileSync(join(dataDir, 'vocaloid.json'), JSON.stringify(generated, null, 2) + '\n');
console.log(`[sync-vocaloid] 已写入 ${join(dataDir, 'vocaloid.json')}(${items.length} 条)`);
