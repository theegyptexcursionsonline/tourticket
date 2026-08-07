import { escapeRegex } from '@/lib/utils/escapeRegex';

// 2026-08-07 incident: a published attraction page carried the keyword
// "Coptic monasteries Egypt\". The homepage built `new RegExp(keyword)` from
// raw editor text, which threw `Invalid regular expression: \ at end of
// pattern`. That error was swallowed by the page's catch, so the storefront
// served a successful-looking homepage with no tours on it at all.
describe('escapeRegex', () => {
  it('makes the exact keyword that took the homepage down a valid pattern', () => {
    const keyword = 'Coptic monasteries Egypt\\';
    expect(() => new RegExp(keyword, 'i')).toThrow();
    expect(() => new RegExp(escapeRegex(keyword), 'i')).not.toThrow();
  });

  it('produces a valid pattern for every regex metacharacter', () => {
    for (const value of ['a\\', '(', ')', '[', ']', '{', '}', '*', '+', '?', '^', '$', '|', '.', 'a(b']) {
      expect(() => new RegExp(escapeRegex(value), 'i')).not.toThrow();
    }
  });

  it('still matches the literal text it escaped, and nothing wider', () => {
    expect(new RegExp(escapeRegex('Egypt (Nile)'), 'i').test('Tour of Egypt (Nile) today')).toBe(true);
    // Unescaped, "a.c" would match "abc"; escaped it must not.
    expect(new RegExp(escapeRegex('a.c'), 'i').test('abc')).toBe(false);
    expect(new RegExp(escapeRegex('a.c'), 'i').test('a.c')).toBe(true);
  });
});
