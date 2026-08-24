import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Content Engine receiver persistence contract', () => {
  it('declares exact content uniqueness and hidden crash-recovery provenance', () => {
    const blog = source('lib/models/Blog.ts');
    const destination = source('lib/models/Destination.ts');
    const category = source('lib/models/Category.ts');

    expect(blog).toContain(
      'BlogSchema.index({ slug: 1, tenantId: 1 }, { unique: true });',
    );
    expect(destination).toContain(
      'DestinationSchema.index({ name: 1, tenantId: 1 }, { unique: true });',
    );
    expect(category).toContain(
      'CategorySchema.index({ tenantId: 1, slug: 1 }, { unique: true });',
    );

    for (const modelSource of [blog, destination, category]) {
      expect(modelSource).toContain('contentEnginePublishReceiptId: {');
      expect(modelSource).toContain('select: false');
      expect(modelSource).toContain("default: 'default'");
      expect(modelSource).toContain(
        'index({ contentEnginePublishReceiptId: 1 }, { unique: true, sparse: true });',
      );
    }

    for (const field of ['region', 'gettingThere', 'gettingAround']) {
      expect(destination).toContain(`${field}: {`);
    }
  });

  it('declares the receipt claim uniqueness and retention TTL', () => {
    const receipt = source('lib/models/ContentPublishReceipt.ts');

    expect(receipt).toContain(
      '{ idempotencyKey: 1, tenantId: 1, contentType: 1 }',
    );
    expect(receipt).toContain('{ unique: true }');
    expect(receipt).toContain(
      'ContentPublishReceiptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });',
    );
  });

  it('ships a non-destructive, explicitly guarded preparation script', () => {
    const migration = source('scripts/migrate-blog-slug-tenant-index.ts');

    expect(migration).toContain("collection: 'contentpublishreceipts'");
    expect(migration).toContain('CONFIRM_CONTENT_INDEX_MIGRATION');
    expect(migration).toContain('CONTENT_INDEX_MIGRATION_BACKUP_ID');
    expect(migration).toContain('ALLOW_REMOTE_CONTENT_INDEX_MIGRATION');
    expect(migration).toContain('--confirm-host');
    expect(migration).toContain('assertNoLogicalDefaultDuplicates');
    expect(migration).not.toContain('dropIndex(');
  });

  it('keeps inactive production model loading from creating receiver collections or indexes', () => {
    const modelSources = [
      source('lib/models/Blog.ts'),
      source('lib/models/Destination.ts'),
      source('lib/models/Category.ts'),
      source('lib/models/ContentPublishReceipt.ts'),
    ];

    for (const file of modelSources) {
      expect(file).toContain("autoIndex: process.env.NODE_ENV !== 'production'");
      expect(file).toContain("autoCreate: process.env.NODE_ENV !== 'production'");
    }
  });
});
