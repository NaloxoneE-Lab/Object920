// src/components/integrations/music/__tests__/MusicPlayer.test.ts
import { describe, it, expect } from 'vitest';
import type { MusicPlayer, MusicPlayerState, Track, Playlist } from '../MusicPlayer';

describe('MusicPlayer types', () => {
  it('MusicPlayerState has correct shape', () => {
    const state: MusicPlayerState = {
      isPlaying: false,
      currentTrackId: null,
      currentPlaylistId: null,
      volume: 1,
    };
    expect(state.isPlaying).toBe(false);
    expect(state.currentTrackId).toBeNull();
    expect(state.volume).toBe(1);
  });

  it('Track has required fields', () => {
    const track: Track = {
      id: 't1',
      title: 'Test Song',
      src: 'https://example.com/song.mp3',
    };
    expect(track.id).toBe('t1');
    expect(track.title).toBe('Test Song');
  });

  it('Track optional fields', () => {
    const track: Track = {
      id: 't2',
      title: 'Full',
      artist: 'Artist',
      src: 'https://example.com/song.mp3',
      cover: 'https://example.com/cover.jpg',
      duration: 180,
    };
    expect(track.artist).toBe('Artist');
    expect(track.duration).toBe(180);
  });

  it('Playlist wraps tracks', () => {
    const playlist: Playlist = {
      id: 'default',
      name: 'My Playlist',
      tracks: [
        { id: 't1', title: 'A', src: 'url-a' },
        { id: 't2', title: 'B', src: 'url-b' },
      ],
    };
    expect(playlist.tracks).toHaveLength(2);
  });

  it('MusicPlayer interface is satisfied by a minimal stub', () => {
    const stub: MusicPlayer = {
      initialize: () => Promise.resolve(),
      ready: () => Promise.resolve(true),
      play: () => Promise.resolve(),
      pause: () => {},
      next: () => Promise.resolve(),
      prev: () => Promise.resolve(),
      setVolume: () => {},
      getState: () => ({
        isPlaying: false,
        currentTrackId: null,
        currentPlaylistId: null,
        volume: 1,
      }),
      onStateChange: () => () => {},
    };
    expect(stub.getState().isPlaying).toBe(false);
    expect(typeof stub.play).toBe('function');
  });
});
// --- HtmlAudioProvider 测试 ---
import { describe as d2, it as i2, expect as e2, vi, beforeEach } from 'vitest';
import { HtmlAudioProvider } from '../HtmlAudioProvider';

// Mock HTMLAudioElement(spec P1-11:audio 是媒体状态唯一真相源)
function createMockAudio() {
  const listeners: Record<string, Array<(e: Event) => void>> = {};
  const state = { src: '', volume: 1, paused: true, duration: NaN, currentTime: 0 };
  const self = {
    ...state,
    duration: NaN,
    currentTime: 0,
    addEventListener: vi.fn((type: string, cb: (e: Event) => void) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(cb);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn((e: Event) => {
      (listeners[e.type] ?? []).forEach((cb) => cb(e));
      return true;
    }),
    play: vi.fn(async () => {
      self.paused = false; // 真实 audio.play() 会先翻状态再触发事件
      (listeners['play'] ?? []).forEach((cb) => cb(new Event('play')));
    }),
    pause: vi.fn(() => {
      self.paused = true;
      (listeners['pause'] ?? []).forEach((cb) => cb(new Event('pause')));
    }),
  };
  return self;
}

const testPlaylists: Playlist[] = [
  {
    id: 'default',
    name: 'Test',
    tracks: [
      { id: 't1', title: 'Song A', src: 'url-a' },
      { id: 't2', title: 'Song B', src: 'url-b' },
      { id: 't3', title: 'Song C', src: 'url-c' },
    ],
  },
];

d2('HtmlAudioProvider', () => {
  let mockAudio: ReturnType<typeof createMockAudio>;
  let provider: HtmlAudioProvider;

  beforeEach(() => {
    mockAudio = createMockAudio();
    provider = new HtmlAudioProvider(mockAudio as unknown as HTMLAudioElement, testPlaylists);
  });

  i2('initialize sets ready state', async () => {
    await provider.initialize();
    e2(await provider.ready()).toBe(true);
  });

  i2('getState returns not playing before play', () => {
    const state = provider.getState();
    e2(state.isPlaying).toBe(false);
    e2(state.currentTrackId).toBeNull();
    e2(state.volume).toBe(1);
  });

  i2('play sets src and calls audio.play()', async () => {
    await provider.initialize();
    await provider.play();
    e2(mockAudio.src).toBe('url-a');
    e2(mockAudio.play).toHaveBeenCalled();
  });

  i2('play with trackId sets correct track', async () => {
    await provider.initialize();
    await provider.play('t2');
    e2(mockAudio.src).toBe('url-b');
  });

  i2('pause calls audio.pause()', async () => {
    await provider.initialize();
    await provider.play();
    provider.pause();
    e2(mockAudio.pause).toHaveBeenCalled();
  });

  i2('next advances to next track and plays', async () => {
    await provider.initialize();
    await provider.play('t1');
    await provider.next();
    e2(mockAudio.src).toBe('url-b');
  });

  i2('next wraps to first track at end', async () => {
    await provider.initialize();
    await provider.play('t3');
    await provider.next();
    e2(mockAudio.src).toBe('url-a');
  });

  i2('prev goes to previous track and plays', async () => {
    await provider.initialize();
    await provider.play('t2');
    await provider.prev();
    e2(mockAudio.src).toBe('url-a');
  });

  i2('prev wraps to last track at start', async () => {
    await provider.initialize();
    await provider.play('t1');
    await provider.prev();
    e2(mockAudio.src).toBe('url-c');
  });

  i2('setVolume clamps to 0-1 and sets on audio', () => {
    provider.setVolume(0.5);
    e2(mockAudio.volume).toBe(0.5);
    provider.setVolume(-1);
    e2(mockAudio.volume).toBe(0);
    provider.setVolume(2);
    e2(mockAudio.volume).toBe(1);
  });

  i2('onStateChange fires on play event', async () => {
    const cb = vi.fn();
    provider.onStateChange(cb);
    await provider.initialize();
    await provider.play();
    e2(cb).toHaveBeenCalled();
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0];
    e2(lastCall.isPlaying).toBe(true);
  });

  i2('onStateChange fires on pause event', async () => {
    const cb = vi.fn();
    provider.onStateChange(cb);
    await provider.initialize();
    await provider.play();
    provider.pause();
    const lastCall = cb.mock.calls[cb.mock.calls.length - 1][0];
    e2(lastCall.isPlaying).toBe(false);
  });

  i2('onStateChange returns unsubscribe function', () => {
    const cb = vi.fn();
    const unsub = provider.onStateChange(cb);
    unsub();
    // 触发事件后 cb 不应被调用
    mockAudio.dispatchEvent(new Event('play'));
    e2(cb).not.toHaveBeenCalled();
  });

  i2('ended event auto-advances to next track', async () => {
    await provider.initialize();
    await provider.play('t1');
    mockAudio.dispatchEvent(new Event('ended'));
    // ended 触发 next(),next() 调 play(),play() 设 src
    e2(mockAudio.src).toBe('url-b');
  });

  i2('getState reflects current track after play', async () => {
    await provider.initialize();
    await provider.play('t2');
    const state = provider.getState();
    e2(state.currentTrackId).toBe('t2');
    e2(state.currentPlaylistId).toBe('default');
  });
});
