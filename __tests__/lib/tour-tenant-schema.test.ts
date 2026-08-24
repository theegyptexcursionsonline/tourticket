import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Tour receiver containment', () => {
  it('preserves the existing globally unique Tour slug schema', () => {
    const source = readFileSync(resolve(process.cwd(), 'lib/models/Tour.ts'), 'utf8');
    const slugField = source.slice(
      source.indexOf('  slug: {'),
      source.indexOf('  // Admin-chosen public URL shape'),
    );

    expect(slugField).toContain('unique: true');
    expect(source).not.toContain(
      'TourSchema.index({ tenantId: 1, slug: 1 }, { unique: true });',
    );
  });

  it('does not prepare a Tour index while Tour publishing is unsupported', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'scripts/migrate-blog-slug-tenant-index.ts'),
      'utf8',
    );
    const route = readFileSync(
      resolve(process.cwd(), 'app/api/admin/content/tour/route.ts'),
      'utf8',
    );

    expect(migration).not.toContain("collection: 'tours'");
    expect(route).toContain('CONTENT_RECEIVER_TOUR_UNSUPPORTED');
    expect(route).not.toContain('Tour.create');
    expect(route).not.toContain('dbConnect');
  });
});
