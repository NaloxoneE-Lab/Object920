// src/lib/__tests__/assets.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('buildDownloadUrls', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.PUBLIC_ASSETS_USER = 'TestUser';
    process.env.PUBLIC_ASSETS_REPO = 'object920-assets';
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it('builds jsDelivr + raw URLs for default mirror', async () => {
    const { buildDownloadUrls } = await import('../assets');
    const result = buildDownloadUrls({
      name: 'Test PDF',
      filename: 'test.pdf',
      mirror: ['jsdelivr', 'raw'],
    });
    expect(result).toHaveLength(2);
    expect(result[0].mirror).toBe('jsdelivr');
    expect(result[0].url).toBe(
      'https://cdn.jsdelivr.net/gh/TestUser/object920-assets@main/datasheets/test.pdf',
    );
    expect(result[1].mirror).toBe('raw');
    expect(result[1].url).toBe(
      'https://raw.githubusercontent.com/TestUser/object920-assets/main/datasheets/test.pdf',
    );
  });

  it('uses datasheet ref in jsDelivr and raw URLs', async () => {
    const { buildDownloadUrls } = await import('../assets');
    const result = buildDownloadUrls({
      name: 'Pinned PDF',
      filename: 'pinned.pdf',
      ref: 'v1.2.0',
      mirror: ['jsdelivr', 'raw'],
    });
    expect(result[0].url).toBe(
      'https://cdn.jsdelivr.net/gh/TestUser/object920-assets@v1.2.0/datasheets/pinned.pdf',
    );
    expect(result[1].url).toBe(
      'https://raw.githubusercontent.com/TestUser/object920-assets/v1.2.0/datasheets/pinned.pdf',
    );
  });

  it('builds release URL with releaseTag', async () => {
    const { buildDownloadUrls } = await import('../assets');
    const result = buildDownloadUrls({
      name: 'Large File',
      filename: 'big.zip',
      mirror: ['release'],
      releaseTag: 'v1.0',
    });
    expect(result).toHaveLength(1);
    expect(result[0].mirror).toBe('release');
    expect(result[0].url).toBe(
      'https://github.com/TestUser/object920-assets/releases/download/v1.0/big.zip',
    );
  });

  it('throws when release mirror without releaseTag', async () => {
    const { buildDownloadUrls } = await import('../assets');
    expect(() =>
      buildDownloadUrls({
        name: 'Bad',
        filename: 'no-tag.zip',
        mirror: ['release'],
      }),
    ).toThrow(/releaseTag/);
  });

  it('preserves mirror order', async () => {
    const { buildDownloadUrls } = await import('../assets');
    const result = buildDownloadUrls({
      name: 'Multi',
      filename: 'multi.pdf',
      mirror: ['raw', 'jsdelivr', 'release'],
      releaseTag: 'v2.0',
    });
    expect(result[0].mirror).toBe('raw');
    expect(result[1].mirror).toBe('jsdelivr');
    expect(result[2].mirror).toBe('release');
  });
});
