// src/components/integrations/music/MusicPlayer.ts
// 纯 .ts 接口定义(spec 5.12)— 不含任何实现
export interface Track {
  id: string;
  title: string;
  artist?: string;
  src: string;
  cover?: string;
  duration?: number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export interface MusicPlayerState {
  isPlaying: boolean;
  currentTrackId: string | null;
  currentPlaylistId: string | null;
  volume: number;
}

export interface MusicPlayer {
  /** 异步初始化(预加载元数据等),首次播放前调用;audio 元素通过构造注入,initialize() 无参(spec P0-2) */
  initialize(): Promise<void>;
  /** 是否就绪(初始化完成);异步用此而非同步 isAvailable */
  ready(): Promise<boolean>;
  /** 播放(从当前曲目,或指定曲目);需 ready 后调用 */
  play(trackId?: string): Promise<void>;
  /** 暂停 */
  pause(): void;
  /** 下一首 */
  next(): Promise<void>;
  /** 上一首 */
  prev(): Promise<void>;
  /** 设置音量 0-1 */
  setVolume(v: number): void;
  /** 获取当前状态(isPlaying/currentTrack 等) */
  getState(): MusicPlayerState;
  /** 状态变化回调注册(控件监听更新 UI);返回取消订阅函数 */
  onStateChange(cb: (state: MusicPlayerState) => void): () => void;
}
