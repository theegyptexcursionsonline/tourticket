import fs from 'node:fs';
import path from 'node:path';

describe('isolated CI fixture contract', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'scripts/seed-ci-fixtures.mjs'),
    'utf8',
  );

  it('seeds a default-tenant storefront without production data', () => {
    expect(source).toContain("tenantId: 'default'");
    expect(source).toContain("database.collection('tours').updateOne");
    expect(source).toContain('isPublished: true');
  });

  it('keeps the production-database safety guard', () => {
    expect(source).toContain("parsedMongoUri?.protocol !== 'mongodb:'");
    expect(source).toContain(
      "throw new Error('CI fixtures may only be seeded into a local MongoDB instance')",
    );
  });
});
