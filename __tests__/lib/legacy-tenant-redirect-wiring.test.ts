import fs from 'node:fs';
import path from 'node:path';

describe('legacy tenant redirect wiring', () => {
  it('resolves the static redirect before the database-backed content lookup', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/content/resolveContentBySlug.ts'),
      'utf8'
    );
    const redirectLookup = source.indexOf('legacyTenantTourUrl(slug, locale)');
    const databaseLookup = source.indexOf('resolveContentMatches(slug)', redirectLookup);

    expect(redirectLookup).toBeGreaterThan(-1);
    expect(databaseLookup).toBeGreaterThan(redirectLookup);
  });
});
