import {
  safeMarkdownRehypePlugins,
  safeMarkdownSchema,
  safeMarkdownUrlTransform,
} from '@/lib/markdown/safeMarkdown';

describe('safe Markdown rendering policy', () => {
  it('always sanitizes parsed raw HTML as the final rehype step', () => {
    expect(safeMarkdownRehypePlugins).toHaveLength(2);
    expect(Array.isArray(safeMarkdownRehypePlugins[1])).toBe(true);
  });

  it.each(['iframe', 'object', 'embed', 'script', 'style', 'form'])(
    'does not permit the %s element',
    (tagName) => {
      expect(safeMarkdownSchema.tagNames).not.toContain(tagName);
    },
  );

  it.each([
    'javascript:alert(1)',
    'java\nscript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<svg onload=alert(1)>',
    'file:///etc/passwd',
  ])('blocks the unsafe URL %s', (url) => {
    expect(safeMarkdownUrlTransform(url)).toBe('');
  });

  it.each([
    '/en/tours',
    '#details',
    'https://example.com/tour',
    'mailto:help@example.com',
    'tel:+201234567890',
  ])('preserves the safe URL %s', (url) => {
    expect(safeMarkdownUrlTransform(url)).toBe(url);
  });

  it('does not allow event handlers or style attributes in the schema', () => {
    const attributes = Object.values(safeMarkdownSchema.attributes || {}).flat();
    const serialized = JSON.stringify(attributes).toLowerCase();

    expect(serialized).not.toContain('onclick');
    expect(serialized).not.toContain('onerror');
    expect(serialized).not.toContain('style');
  });
});
