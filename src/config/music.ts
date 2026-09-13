// src/config/music.ts
// MVP 歌单数据(spec 5.12):放主仓配置,后期若需 CMS 编辑再迁 content
// 音频文件托管 assets 仓,走 jsDelivr/raw CDN(spec 7.7);仓库标识来自构建环境变量
import type { Playlist } from '@components/integrations/music/MusicPlayer';

const ASSETS_USER = import.meta.env.PUBLIC_ASSETS_USER ?? 'NaloxoneE-Lab';
const ASSETS_REPO = import.meta.env.PUBLIC_ASSETS_REPO ?? 'object920-assets';
const AUDIO_BASE = `https://cdn.jsdelivr.net/gh/${ASSETS_USER}/${ASSETS_REPO}@main/audio`;

export const playlists: Playlist[] = [
  {
    id: 'default',
    name: '默认歌单',
    tracks: [
      {
        id: 't1',
        title: '示例曲目 A',
        artist: '示例 P 主',
        src: `${AUDIO_BASE}/track-a.mp3`,
      },
      {
        id: 't2',
        title: '示例曲目 B',
        artist: '示例 P 主',
        src: `${AUDIO_BASE}/track-b.mp3`,
      },
    ],
  },
];
