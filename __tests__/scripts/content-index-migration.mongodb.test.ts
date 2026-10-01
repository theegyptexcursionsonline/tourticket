/** @jest-environment node */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let server: MongoMemoryServer;
let client: MongoClient;
const database = 'receiver_index_migration_test';
const names = ['blogs', 'destinations', 'categories', 'contentpublishreceipts'];
beforeAll(async () => {
  server = await MongoMemoryServer.create();
  client = await new MongoClient(server.getUri(database)).connect();
}, 60_000);
afterAll(async () => { await client.close(); await server.stop(); });
beforeEach(async () => {
  await client.db().dropDatabase();
  for (const name of names) await client.db().createCollection(name);
});
function migrate(apply = true, confirmedDatabase = database) {
  return spawnSync(path.resolve('node_modules/.bin/tsx'), [
    'scripts/migrate-blog-slug-tenant-index.ts',
    ...(apply ? ['--apply', '--confirm', confirmedDatabase, '--confirm-host', '127.0.0.1'] : []),
  ], { encoding: 'utf8', timeout: 30_000, env: {
    ...process.env, MONGODB_URI: server.getUri(database),
    CONFIRM_CONTENT_INDEX_MIGRATION: 'YES', CONTENT_INDEX_MIGRATION_BACKUP_ID: 'isolated-test-restore',
  } });
}
async function snapshot() {
  return Promise.all(names.map(async name => ({ name, indexes: await client.db().collection(name).indexes() })));
}
it('creates exact non-TTL and zero-TTL indexes and is an identical no-op on rerun', async () => {
  await client.db().collection('blogs').createIndex({ title: 1 }, { name: 'existing_title_lookup', unique: false });
  const before = await client.db().collection('blogs').indexes();
  expect(migrate(false).status).toBe(0);
  expect(await client.db().collection('blogs').indexes()).toEqual(before);
  const first = migrate();
  expect({ status: first.status, error: first.stderr }).toEqual({ status: 0, error: '' });
  const blogs = await client.db().collection('blogs').indexes();
  expect(blogs.find(index => index.name === 'contentEngineUpdateReceiptId_1')).toMatchObject({
    key: { contentEngineUpdateReceiptId: 1 }, unique: true, sparse: true,
  });
  expect(blogs.find(index => index.name === 'contentEngineUpdateReceiptId_1')).not.toHaveProperty('expireAfterSeconds');
  expect(blogs.find(index => index.name === 'existing_title_lookup')).toEqual(before.find(index => index.name === 'existing_title_lookup'));
  expect((await client.db().collection('contentpublishreceipts').indexes()).find(index => index.name === 'expiresAt_1')).toMatchObject({ key: { expiresAt: 1 }, expireAfterSeconds: 0 });
  const after = await snapshot();
  const second = migrate();
  expect(second.status).toBe(0);
  expect(second.stdout).toContain('Nothing to do; exact indexes are present.');
  expect(await snapshot()).toEqual(after);
});
it('refuses an incompatible late-collection index before creating earlier missing indexes', async () => {
  await client.db().collection('categories').createIndex({ tenantId: 1, slug: 1 }, { name: 'tenantId_1_slug_1', unique: false });
  const before = await snapshot();
  const result = migrate();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('incompatible specification');
  expect(await snapshot()).toEqual(before);
});
it('refuses duplicate logical-default keys in a late collection before any index write', async () => {
  await client.db().collection('categories').insertMany([{ slug: 'same', name: 'First', tenantId: null }, { slug: 'same', name: 'Second', tenantId: 'default' }]);
  const before = await snapshot();
  const result = migrate();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('duplicate logical-default slug');
  expect(await snapshot()).toEqual(before);
  expect(await client.db().collection('categories').countDocuments({})).toBe(2);
});
it('refuses a wrong confirmed database before any index write', async () => {
  const before = await snapshot();
  const result = migrate(true, 'different_namespace');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Refusing to apply');
  expect(await snapshot()).toEqual(before);
});
it('defers missing receipt collection creation until apply and preserves the zero-TTL contract', async () => {
  await client.db().collection('contentpublishreceipts').drop();
  expect(migrate(false).status).toBe(0);
  expect(await client.db().listCollections({ name: 'contentpublishreceipts' }).toArray()).toEqual([]);
  expect(migrate().status).toBe(0);
  expect((await client.db().collection('contentpublishreceipts').indexes()).find(index => index.name === 'expiresAt_1')).toMatchObject({ key: { expiresAt: 1 }, expireAfterSeconds: 0 });
  const after = await snapshot();
  expect(migrate().status).toBe(0);
  expect(await snapshot()).toEqual(after);
});
