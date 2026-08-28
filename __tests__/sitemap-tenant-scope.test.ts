import fs from 'node:fs';
import path from 'node:path';

describe('flagship sitemap tenant scope', () => {
  it('scopes every public content collection to EEO and strict publication', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/sitemap.ts'), 'utf8');
    const publicQueries = source.match(/\{ \.\.\.DEFAULT_TENANT_FILTER, \.\.\.PUBLIC_CONTENT_FILTER \}/g) ?? [];

    expect(publicQueries).toHaveLength(4);
    expect(source).toContain("{ status: 'published', ...DEFAULT_TENANT_FILTER }");
    expect(source).not.toContain('NOT_ARCHIVED_FILTER');
    expect(source).not.toContain('isPublished: { $ne: false }');
  });
});
