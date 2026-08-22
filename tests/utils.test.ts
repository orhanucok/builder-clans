import { describe, it, expect } from 'vitest';
import { slugify, formatNumber, clamp, initials, colorFromString, groupBy, truncate } from '@/lib/utils';

describe('slugify', () => {
  it('handles simple title', () => {
    expect(slugify('Lung CT AI')).toBe('lung-ct-ai');
  });
  it('removes accents', () => {
    expect(slugify('İTÜ Robotics')).toBe('itu-robotics');
  });
  it('strips illegal chars', () => {
    expect(slugify('Hello!!! World???')).toBe('hello-world');
  });
  it('collapses dashes', () => {
    expect(slugify('a -- b')).toBe('a-b');
  });
  it('truncates long strings', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe('formatNumber', () => {
  it('formats with thousands separators', () => {
    expect(formatNumber(1234)).toMatch(/1,234/);
    expect(formatNumber(0)).toBe('0');
  });
});

describe('clamp', () => {
  it('clamps within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('initials', () => {
  it('returns 1–2 chars', () => {
    expect(initials('Ahmet Yılmaz')).toBe('AY');
    expect(initials('Ahmet')).toBe('AH');
    expect(initials('')).toBe('?');
    expect(initials(null)).toBe('?');
  });
});

describe('colorFromString', () => {
  it('is deterministic', () => {
    expect(colorFromString('a')).toBe(colorFromString('a'));
    expect(colorFromString('a')).not.toBe(colorFromString('b'));
  });
  it('returns hsl string', () => {
    expect(colorFromString('test')).toMatch(/^hsl\(/);
  });
});

describe('groupBy', () => {
  it('groups correctly', () => {
    const items = [
      { type: 'A', v: 1 },
      { type: 'B', v: 2 },
      { type: 'A', v: 3 },
    ];
    const grouped = groupBy(items, (i) => i.type);
    expect(grouped.A.length).toBe(2);
    expect(grouped.B.length).toBe(1);
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });
  it('truncates long strings', () => {
    expect(truncate('hello world', 5)).toBe('hell…');
  });
});
