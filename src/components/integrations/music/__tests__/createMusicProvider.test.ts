// src/components/integrations/music/__tests__/createMusicProvider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 最小 mock audio 元素
function createMockAudio() {
  return {
    src: '',
    volume: 1,
    paused: true,
    duration: NaN,
    currentTime: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    play: vi.fn(async () => {}),
    pause: vi.fn(),
  };
}

describe('createMusicProvider', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns HtmlAudioProvider for "html5audio"', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', 'html5audio');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    const provider = createMusicProvider(audio as unknown as HTMLAudioElement);
    expect(provider).not.toBeNull();
    expect(provider).toHaveProperty('initialize');
    expect(provider).toHaveProperty('play');
    expect(provider).toHaveProperty('getState');
  });

  it('returns null for "none"', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', 'none');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    expect(createMusicProvider(audio as unknown as HTMLAudioElement)).toBeNull();
  });

  it('throws for "howler" (not yet implemented)', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', 'howler');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    expect(() => createMusicProvider(audio as unknown as HTMLAudioElement)).toThrow(
      'Unknown music provider: howler',
    );
  });

  it('throws for unknown provider', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', 'spotify');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    expect(() => createMusicProvider(audio as unknown as HTMLAudioElement)).toThrow(
      'Unknown music provider: spotify',
    );
  });

  it('defaults to html5audio when env not set', async () => {
    vi.stubEnv('PUBLIC_MUSIC_PROVIDER', '');
    const { createMusicProvider } = await import('../createMusicProvider');
    const audio = createMockAudio();
    const provider = createMusicProvider(audio as unknown as HTMLAudioElement);
    expect(provider).not.toBeNull();
  });
});
