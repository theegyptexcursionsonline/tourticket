import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(process.cwd(), 'app/[locale]/blog/[slug]/BlogPostClient.tsx'),
  'utf8',
);

describe('blog article dark-mode contrast contract', () => {
  it('scopes every article card and the rich article body to the storefront dark theme', () => {
    expect(source).toContain('blog-post-page bg-stone-50');
    expect(source).toMatch(/blog-card[^"\n]*blog-content/);
    expect(source).toContain('body.storefront-theme .blog-post-page .blog-card');
    expect(source).toContain('body.storefront-theme .blog-post-page .blog-content');
  });

  it.each([
    ':is(h2, h3, h4, strong, summary)',
    'blockquote',
    'code:not(pre > code)',
    ':is(th, td, details)',
  ])('defines a dark treatment for %s', (selector) => {
    expect(source).toContain(`.blog-content ${selector}`);
  });

  it('keeps table and FAQ-like details readable in both themes', () => {
    expect(source).toContain('.blog-content table');
    expect(source).toContain('.blog-content details');
    expect(source).toContain('.blog-content summary');
    expect(source).toContain('background: #1e293b');
  });
});
