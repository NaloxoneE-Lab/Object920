// src/components/article/__tests__/codeGutter.test.ts
import { describe, it, expect } from 'vitest';
import { applyGutterHeights } from '@components/article/codeGutter';

interface Row {
  style: { height: string };
}
interface Line {
  height: number;
  getBoundingClientRect(): { height: number };
}

const row = (height = ''): Row => ({ style: { height } });
const line = (height: number): Line => ({ height, getBoundingClientRect: () => ({ height }) });

describe('applyGutterHeights', () => {
  it('wrapped: writes each measured line height onto its gutter row', () => {
    const rows = [row(), row()];
    applyGutterHeights(rows, [line(28), line(56.5)], true);
    expect(rows[0].style.height).toBe('28px');
    expect(rows[1].style.height).toBe('56.5px');
  });

  it('not wrapped: clears inline heights so rows fall back to 1lh', () => {
    const rows = [row('28px'), row('56.5px')];
    applyGutterHeights(rows, [line(28), line(56)], false);
    expect(rows[0].style.height).toBe('');
    expect(rows[1].style.height).toBe('');
  });

  it('leaves rows untouched when row and line counts disagree', () => {
    const rows = [row('28px')];
    applyGutterHeights(rows, [line(28), line(56)], true);
    expect(rows).toHaveLength(1);
    expect(rows[0].style.height).toBe('28px');
  });
});
