import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Tour tenant namespace schema', () => {
  it('persists tenant ownership and uses tenant-local slug uniqueness', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/models/Tour.ts'), 'utf8');
    expect(source).toContain("tenantId: { type: String, trim: true, index: true }");
    expect(source).toContain(
      'TourSchema.index({ tenantId: 1, slug: 1 }, { unique: true });',
    );

    const slugField = source.slice(
      source.indexOf('  slug: {'),
      source.indexOf('  // Admin-chosen public URL shape'),
    );
    expect(slugField).not.toContain('unique: true');
  });

  it('ships a guarded migration for the legacy global tour slug index', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'scripts/migrate-blog-slug-tenant-index.ts'),
      'utf8',
    );
    expect(source).toContain("collection: 'tours'");
    expect(source).toContain("legacyIndexNames: ['slug_1']");
    expect(source).toContain(
      "{ name: 'tenantId_1_slug_1', key: { tenantId: 1, slug: 1 }, unique: true }",
    );
    expect(source).toContain("const apply = process.argv.includes('--apply')");
    expect(source).toContain('Refusing to apply: --confirm must name the connected database');
  });
});
