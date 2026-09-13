// src/scripts/vocaloid-artists.mjs
// 歌手名单 → 制作人 / 虚拟歌姬 分类,sync-vocaloid.mjs 与单测共用,保持无副作用。
// 命中虚拟歌姬名单的归入 vocaloid[],第一个未命中的作为 producer;
// 全部命中时 producer 取第一位(纯调音作品常见“歌姬即作者”的署名习惯)。
// 名单允许增补:未命中不会报错,只是 producer/vocaloid 归类保守,可用 notes 覆盖修正。

const VIRTUAL_SINGERS = new Set(
  [
    // 日系
    '初音ミク',
    '初音未来',
    'hatsune miku',
    '鏡音リン',
    '镜音铃',
    'kagamine rin',
    '鏡音レン',
    '镜音连',
    'kagamine len',
    '鏡音リン・レン',
    '镜音铃·连',
    '巡音ルカ',
    '巡音流歌',
    '巡音流江',
    'megurine luka',
    'meiko',
    'kaito',
    'gumi',
    'ia',
    'v flower',
    'flower',
    '結月ゆかり',
    '结月缘',
    'yuzuki yukari',
    '紲星あかり',
    '绁星灯',
    '蒼姫ラピス',
    '苍姬拉碧斯',
    'aoki lapis',
    '歌愛ユキ',
    '歌爱雪',
    'kaai yuki',
    '音街ウナ',
    '音街鳗',
    'otomachi una',
    '重音テト',
    '重音teto',
    'kasane teto',
    'ずんだもん',
    '俊达萌',
    'zundamon',
    '可不',
    'kafu',
    // 中 V
    '洛天依',
    'luo tianyi',
    '言和',
    'yan he',
    '心華',
    '心华',
    'xin hua',
    '乐正绫',
    'yuezheng ling',
    '乐正龙牙',
    'yuezheng longya',
    '星尘',
    'stardust',
    '赤羽',
  ].map((name) => name.toLowerCase()),
);

export function splitVocaloidArtists(artists) {
  const names = artists.map((a) => String(a ?? '').trim()).filter(Boolean);
  const vocaloid = names.filter((n) => VIRTUAL_SINGERS.has(n.toLowerCase()));
  const human = names.filter((n) => !VIRTUAL_SINGERS.has(n.toLowerCase()));
  return { producer: human[0] ?? names[0] ?? '未知', vocaloid };
}
