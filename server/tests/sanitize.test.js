// Tests for the UGC sanitizer utility (server/src/utils/sanitize.js).
// Uses the real `isomorphic-dompurify` library — verifies our wrapper behaviour.

import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeRichText, sanitizeObject } from '../src/utils/sanitize.js';

describe('sanitizeText', () => {
  it('strips <script>alert(1)</script> to an empty string', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('');
  });

  it('preserves plain text "Hello world"', () => {
    expect(sanitizeText('Hello world')).toBe('Hello world');
  });

  it('strips <img src=x onerror=alert(1)> and keeps text content', () => {
    // DOMPurify strips the tag; KEEP_CONTENT preserves any text inside.
    const result = sanitizeText('<img src=x onerror=alert(1)>');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('strips javascript: URL inside <a href>', () => {
    const result = sanitizeText('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('href=');
    // Text content "click" should be kept.
    expect(result).toContain('click');
  });

  it('preserves unicode (e.g. cafe + emoji)', () => {
    expect(sanitizeText('café 🎉')).toBe('café 🎉');
  });

  it('handles null/undefined/non-string gracefully', () => {
    expect(sanitizeText(null)).toBe(null);
    expect(sanitizeText(undefined)).toBe(undefined);
    expect(sanitizeText(123)).toBe(123);
    expect(sanitizeText({ a: 1 })).toEqual({ a: 1 });
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeText('   hello   ')).toBe('hello');
    expect(sanitizeText('\n\thello world\n\t')).toBe('hello world');
  });
});

describe('sanitizeRichText', () => {
  it('allows <a href="https://example.com">link</a>', () => {
    const result = sanitizeRichText('<a href="https://example.com">link</a>');
    expect(result).toContain('<a');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('link');
  });

  it('strips <script> from rich text', () => {
    const result = sanitizeRichText('hello <script>alert(1)</script> world');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('hello');
    expect(result).toContain('world');
  });
});

describe('sanitizeObject', () => {
  it('only sanitizes listed fields (leaves userId etc. untouched)', () => {
    const input = {
      userId: '<script>alert(1)</script>',
      name: '<b>Acme</b>',
      description: '<img src=x onerror=alert(2)>',
      age: 42,
    };
    const out = sanitizeObject(input, ['name', 'description']);
    // userId untouched (not in fields list)
    expect(out.userId).toBe('<script>alert(1)</script>');
    // age untouched (not a string)
    expect(out.age).toBe(42);
    // name: <b> is stripped in plain mode but text kept
    expect(out.name).not.toContain('<b>');
    expect(out.name).toContain('Acme');
    // description: img tag stripped
    expect(out.description).not.toContain('<img');
    expect(out.description).not.toContain('onerror');
  });

  it('with deep: true recurses into nested objects and arrays', () => {
    const input = {
      title: '<script>x</script>',
      meta: {
        description: '<img src=x onerror=y>',
        author: 'safe',
      },
      items: [
        { description: '<script>a</script>', qty: 1 },
        { description: '<b>bold</b>', qty: 2 },
      ],
    };
    const out = sanitizeObject(input, ['title', 'description'], { deep: true });
    expect(out.title).toBe('');
    expect(out.meta.description).not.toContain('<img');
    expect(out.meta.author).toBe('safe');
    expect(out.items[0].description).toBe('');
    expect(out.items[1].description).toContain('bold');
    expect(out.items[1].description).not.toContain('<b>');
  });
});
