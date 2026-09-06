// src/lib/__tests__/content.test.ts
import { describe, it, expect } from 'vitest';
import { validateOgImageFields, validateCollectionItemIds } from '@lib/content';

describe('validateOgImageFields (spec P1-10)', () => {
  it('passes when only one or none is set', () => {
    expect(() =>
      validateOgImageFields([
        { id: 'zh/a', data: { ogImage: 'https://example.com/og.png' } },
        { id: 'zh/b', data: { ogImageLocal: { src: '/x.png' } } },
        { id: 'zh/c', data: {} },
      ]),
    ).not.toThrow();
  });

  it('fails when both ogImage and ogImageLocal set', () => {
    expect(() =>
      validateOgImageFields([
        {
          id: 'zh/d',
          data: { ogImage: 'https://example.com/og.png', ogImageLocal: { src: '/x.png' } },
        },
      ]),
    ).toThrow(/mutually exclusive/);
  });
});

describe('validateCollectionItemIds (spec P1-2)', () => {
  it('passes for unique ids', () => {
    expect(() => validateCollectionItemIds('anime', [{ id: 'a' }, { id: 'b' }])).not.toThrow();
  });

  it('fails for missing or duplicate ids', () => {
    expect(() => validateCollectionItemIds('anime', [{ id: '' }])).toThrow(/missing/);
    expect(() => validateCollectionItemIds('anime', [{ id: 'a' }, { id: 'a' }])).toThrow(
      /duplicate/,
    );
  });
});
