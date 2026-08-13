import fs from 'node:fs';
import path from 'node:path';

describe('flagship sitemap tenant scope', () => {
  it('scopes every shared content collection to the default EEO tenant', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/sitemap.ts'), 'utf8');
    const scopedQueries = source.match(/\{ isPublished: true, \.\.\.DEFAULT_TENANT_FILTER \}/g) ?? [];

    // Tour, Category and AttractionPage. Destination and Blog use slightly
    // different publication predicates but are also explicitly scoped.
    expect(scopedQueries).toHaveLength(3);
    expect(source).toContain('{ isPublished: { $ne: false }, ...DEFAULT_TENANT_FILTER }');
    expect(source).toContain("{ status: 'published', ...DEFAULT_TENANT_FILTER }");
  });
});
