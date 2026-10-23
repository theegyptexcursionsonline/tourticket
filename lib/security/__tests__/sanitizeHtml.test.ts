import { execFileSync } from 'node:child_process';

// Exercise the real parser dependency graph in Node, including its ESM modules.
function sanitizeRichHtml(input: string): string {
  const source = `
    const { sanitizeRichHtml } = require('./lib/security/sanitizeHtml.ts');
    process.stdout.write(JSON.stringify(sanitizeRichHtml(${JSON.stringify(input)})));
  `;
  return JSON.parse(execFileSync(process.execPath, ['--require', 'tsx/cjs', '--eval', source], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }));
}

describe('rich text sanitization with patched dependencies', () => {
  it('preserves supported formatting and trusted video embeds', () => {
    const html = sanitizeRichHtml('<p><strong>Tour details</strong></p><iframe src="https://www.youtube.com/embed/example" title="Tour video"></iframe><a href="https://example.com/tour" target="_blank">Details</a>');
    expect(html).toContain('<strong>Tour details</strong>');
    expect(html).toContain('src="https://www.youtube.com/embed/example"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('removes active content and untrusted iframe sources', () => {
    const html = sanitizeRichHtml('<img src="https://example.com/image.jpg" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">Link</a><iframe src="https://untrusted.example/embed"></iframe>');
    expect(html).not.toMatch(/onerror|<script|javascript:|untrusted\.example/);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('Link');
  });

  it('handles nested untrusted iframe fallback content without throwing', () => {
    const input = '<iframe src="https://untrusted.example">'.repeat(2000) + '<script>alert(1)</script>';
    let html = '';
    expect(() => { html = sanitizeRichHtml(input); }).not.toThrow();
    // Escaped fallback text may retain the input URL, but no active embed may.
    expect(/<script|<iframe[^>]+src=/i.test(html)).toBe(false);
  });
});
