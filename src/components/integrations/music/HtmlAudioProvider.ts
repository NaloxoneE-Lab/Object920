// src/components/integrations/music/HtmlAudioProvider.ts
import type { MusicPlayer, MusicPlayerState, Playlist, Track } from './MusicPlayer';

/**
 * HTML5 Audio MVP 实现(spec 5.12)。
 * - 构造函数接收外部传入的 <audio> 元素(MusicHost 提供,spec P0-2)
 * - HTMLAudioElement 是媒体状态唯一真相源(spec P1-11):isPlaying = !audio.paused, volume = audio.volume
 * - initialize() 无参:在已注入的 audio 上加载歌单元数据
 * - 默认不播放:只有用户点击 play() 才开始(spec 5.12)
 */
export class HtmlAudioProvider implements MusicPlayer {
  private audio: HTMLAudioElement;
  private playlists: Playlist[];
  private currentPlaylistIndex = 0;
  private currentTrackIndex = 0;
  private initialized = false;
  private listeners: Set<(state: MusicPlayerState) => void> = new Set();
  private audioBound = false;

  constructor(audioElement: HTMLAudioElement, playlists?: Playlist[]) {
    this.audio = audioElement;
    // playlists 可选注入(测试用);不传时延迟到 initialize 从 @config/music 加载
    this.playlists = playlists ?? [];
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    // 延迟加载歌单配置(避免构造时 import 导致循环依赖)
    if (this.playlists.length === 0) {
      const { playlists: configPlaylists } = await import('@config/music');
      this.playlists = configPlaylists;
    }
    this.initialized = true;
    if (!this.audioBound) {
      this.bindAudioEvents();
      this.audioBound = true;
    }
  }

  async ready(): Promise<boolean> {
    return this.initialized;
  }

  async play(trackId?: string): Promise<void> {
    if (trackId) {
      this.setTrackById(trackId);
    }
    const track = this.getCurrentTrack();
    if (!track) return;
    this.audio.src = track.src;
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  async next(): Promise<void> {
    const playlist = this.getCurrentPlaylist();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % playlist.tracks.length;
    await this.play();
  }

  async prev(): Promise<void> {
    const playlist = this.getCurrentPlaylist();
    const len = playlist.tracks.length;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + len) % len;
    await this.play();
  }

  setVolume(v: number): void {
    this.audio.volume = Math.max(0, Math.min(1, v));
    this.notifyStateChange();
  }

  getState(): MusicPlayerState {
    // HTMLAudioElement 是唯一真相源(spec P1-11)
    return {
      isPlaying: !this.audio.paused,
      // 未开始播放时(audio 无 src)不报告任何当前曲目(spec 5.12 默认不播放)
      currentTrackId: this.audio.src ? (this.getCurrentTrack()?.id ?? null) : null,
      currentPlaylistId: this.getCurrentPlaylist()?.id ?? null,
      volume: this.audio.volume,
    };
  }

  onStateChange(cb: (state: MusicPlayerState) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private getCurrentPlaylist(): Playlist {
    return this.playlists[this.currentPlaylistIndex] ?? { id: '', name: '', tracks: [] };
  }

  private getCurrentTrack(): Track | undefined {
    return this.getCurrentPlaylist().tracks[this.currentTrackIndex];
  }

  private setTrackById(trackId: string): void {
    for (let p = 0; p < this.playlists.length; p++) {
      const idx = this.playlists[p].tracks.findIndex((t) => t.id === trackId);
      if (idx >= 0) {
        this.currentPlaylistIndex = p;
        this.currentTrackIndex = idx;
        return;
      }
    }
  }

  private bindAudioEvents(): void {
    this.audio.addEventListener('play', () => this.notifyStateChange());
    this.audio.addEventListener('pause', () => this.notifyStateChange());
    this.audio.addEventListener('ended', () => {
      void this.next();
    });
    this.audio.addEventListener('volumechange', () => this.notifyStateChange());
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }
}
