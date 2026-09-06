// src/components/integrations/music/createMusicProvider.ts
import type { MusicPlayer } from './MusicPlayer';
import { HtmlAudioProvider } from './HtmlAudioProvider';

/**
 * 按 PUBLIC_MUSIC_PROVIDER 选 Provider 的 resolver(spec 5.12)。
 * 调用方(MusicHost/Widget)负责传入 host 内的 <audio> 元素(spec P0-2)。
 * none → 返回 null(Widget 零 DOM);未实现的 provider → throw(spec P0-11/P1-8)。
 */
export function createMusicProvider(audioElement: HTMLAudioElement): MusicPlayer | null {
  const provider = import.meta.env.PUBLIC_MUSIC_PROVIDER || 'html5audio';
  switch (provider) {
    case 'html5audio':
      return new HtmlAudioProvider(audioElement);
    // case 'howler': return new HowlerProvider(); // 未来,不实现
    case 'none':
      return null;
    default:
      throw new Error(`Unknown music provider: ${provider}`);
  }
}
