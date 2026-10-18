// src/lib/__tests__/theme-wipe.test.ts
import { describe, it, expect } from 'vitest';
import {
  revealRadius,
  wipeOrigin,
  canPlayWipe,
  wallpaperSrcFor,
  resolveWipeDurationMs,
} from '@lib/theme-wipe';

const viewport = { innerWidth: 1000, innerHeight: 500 };

describe('resolveWipeDurationMs', () => {
  it('解析 ms / s 两种写法', () => {
    expect(resolveWipeDurationMs('400ms')).toBe(400);
    expect(resolveWipeDurationMs(' 2.8s ')).toBe(2800);
    expect(resolveWipeDurationMs('120000ms')).toBe(120000);
  });

  it('读不到/野值/非正数都退回默认 400ms', () => {
    expect(resolveWipeDurationMs('')).toBe(400);
    expect(resolveWipeDurationMs(null)).toBe(400);
    expect(resolveWipeDurationMs(undefined)).toBe(400);
    expect(resolveWipeDurationMs('calc(1s)')).toBe(400);
    expect(resolveWipeDurationMs('0ms')).toBe(400);
  });
});

describe('revealRadius', () => {
  it('取圆心到最远角的距离', () => {
    expect(revealRadius({ x: 100, y: 100 }, viewport)).toBeCloseTo(Math.hypot(900, 400));
  });

  it('圆心在正中时到四角等距', () => {
    expect(revealRadius({ x: 500, y: 250 }, viewport)).toBeCloseTo(Math.hypot(500, 250));
  });
});

describe('wipeOrigin', () => {
  it('优先用鼠标坐标', () => {
    expect(wipeOrigin({ clientX: 12, clientY: 34 }, viewport)).toEqual({ x: 12, y: 34 });
  });

  it('键盘触发(坐标全为 0)退化到焦点元素中心', () => {
    const el = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) };
    expect(wipeOrigin(null, viewport, el)).toEqual({ x: 120, y: 60 });
  });

  it('没有焦点元素时退化到视口中心', () => {
    expect(wipeOrigin(null, viewport)).toEqual({ x: 500, y: 250 });
  });

  it('零尺寸的焦点元素(如 body)不参与定位', () => {
    const el = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) };
    expect(wipeOrigin(null, viewport, el)).toEqual({ x: 500, y: 250 });
  });
});

describe('canPlayWipe', () => {
  it('只有「没有壁纸可展示」时才退化为瞬时切换', () => {
    expect(canPlayWipe('/a.webp')).toBe(true);
    expect(canPlayWipe(null)).toBe(false);
    expect(canPlayWipe(undefined)).toBe(false);
    expect(canPlayWipe('')).toBe(false);
  });
});

describe('wallpaperSrcFor', () => {
  const layer = (dataset: Record<string, string>) => ({
    querySelector: () => ({ dataset }),
  });

  it('按主题读对应的 data 属性', () => {
    const root = layer({ wallpaperLight: '/l.webp', wallpaperDark: '/d.webp' });
    expect(wallpaperSrcFor('light', root as unknown as ParentNode)).toBe('/l.webp');
    expect(wallpaperSrcFor('dark', root as unknown as ParentNode)).toBe('/d.webp');
  });

  it('没有壁纸层时返回 null(调用方退化为瞬时切换)', () => {
    const root = { querySelector: () => null };
    expect(wallpaperSrcFor('dark', root as unknown as ParentNode)).toBeNull();
  });
});
