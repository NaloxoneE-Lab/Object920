// src/scripts/__tests__/vocaloid-artists.test.mjs
import { describe, it, expect } from 'vitest';
import { splitVocaloidArtists } from '../vocaloid-artists.mjs';

describe('splitVocaloidArtists', () => {
  it('虚拟歌姬归入 vocaloid[],第一个真人歌手作为 producer', () => {
    const { producer, vocaloid } = splitVocaloidArtists(['DECO*27', '初音ミク', '鏡音リン']);
    expect(producer).toBe('DECO*27');
    expect(vocaloid).toEqual(['初音ミク', '鏡音リン']);
  });

  it('全部为虚拟歌姬时 producer 取第一位', () => {
    const { producer, vocaloid } = splitVocaloidArtists(['初音ミク', 'GUMI']);
    expect(producer).toBe('初音ミク');
    expect(vocaloid).toEqual(['初音ミク', 'GUMI']);
  });

  it('英文名与中文别名同样命中(大小写不敏感)', () => {
    const { vocaloid } = splitVocaloidArtists(['Hatsune Miku', '洛天依', 'Kasane Teto']);
    expect(vocaloid).toEqual(['Hatsune Miku', '洛天依', 'Kasane Teto']);
  });

  it('无歌手时 producer 为未知,vocaloid 为空', () => {
    const { producer, vocaloid } = splitVocaloidArtists([]);
    expect(producer).toBe('未知');
    expect(vocaloid).toEqual([]);
  });

  it('忽略 null/空串歌手项', () => {
    const { producer, vocaloid } = splitVocaloidArtists([null, '', '乱数アシ', undefined]);
    expect(producer).toBe('乱数アシ');
    expect(vocaloid).toEqual([]);
  });
});
