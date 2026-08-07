/**
 * Escape editor-entered text so it can be used inside a regular expression.
 *
 * Titles, keywords and search terms are content, not patterns. Building a
 * RegExp (or a Mongo `$regex`) from them raw makes page rendering depend on
 * whatever an operator typed: on 2026-08-07 a single attraction-page keyword
 * ending in a backslash threw `Invalid regular expression: \ at end of
 * pattern`, and because the homepage caught its own error and returned empty
 * data, the storefront served a successful-looking page with no tours at all.
 *
 * Keep this module dependency-free so any layer can use it.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
