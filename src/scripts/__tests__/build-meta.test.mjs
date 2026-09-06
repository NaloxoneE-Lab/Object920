// src/scripts/__tests__/build-meta.test.mjs
import { describe, it, expect } from 'vitest';
import { collectBuildMeta } from '../build-meta.mjs';

describe('collectBuildMeta', () => {
  it('uses GITHUB_SHA when provided', () => {
    const meta = collectBuildMeta({ GITHUB_SHA: 'abc123' }, () => null);
    expect(meta.mainCommit).toBe('abc123');
  });

  it('falls back to git rev-parse when GITHUB_SHA absent', () => {
    const gitRunner = (args) => (args.includes('rev-parse') ? 'def456' : null);
    const meta = collectBuildMeta({}, gitRunner);
    expect(meta.mainCommit).toBe('def456');
  });

  it('falls back to unknown when no git available', () => {
    const meta = collectBuildMeta({}, () => null);
    expect(meta.mainCommit).toBe('unknown');
  });

  it('uses CONTENT_COMMIT env for contentCommit', () => {
    const meta = collectBuildMeta({ CONTENT_COMMIT: 'sha1' }, () => null);
    expect(meta.contentCommit).toBe('sha1');
  });

  it('reads contentUpdatedAt from git log when available', () => {
    const gitRunner = (args, cwd) => {
      if (cwd === 'src/content' && args.includes('log')) return '2026-01-15T10:00:00+08:00';
      return null;
    };
    const meta = collectBuildMeta({}, gitRunner);
    expect(meta.contentUpdatedAt).toBe('2026-01-15T10:00:00+08:00');
  });

  it('contentUpdatedAt is unknown when content repo missing', () => {
    const meta = collectBuildMeta({}, () => null);
    expect(meta.contentUpdatedAt).toBe('unknown');
  });

  it('always includes buildTime as ISO string', () => {
    const meta = collectBuildMeta({}, () => null);
    expect(meta.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('omits nodeVersion by default', () => {
    const meta = collectBuildMeta({}, () => null);
    expect(meta.nodeVersion).toBeUndefined();
  });

  it('adds nodeVersion when BUILD_META_DEBUG=true', () => {
    const meta = collectBuildMeta({ BUILD_META_DEBUG: 'true' }, () => null);
    expect(meta.nodeVersion).toBe(process.version);
  });
});
