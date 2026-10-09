/** @jest-environment node */
import { createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { canonicalFeedQuery } from '@/lib/integrations/bookingFeed';

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));

import { GET } from '../route';

const SECRET = 'qa-feed-secret-0123456789-abcdefghijklmnop';
const ORIGIN = 'https://www.qa.invalid';
const PATH = '/api/internal/booking-feed';
let server: MongoMemoryServer;

/** Signs a request the way the booking API does (the rule both ends follow). */
function signed(query: string, options: { secret?: string; at?: number } = {}) {
  const url = new URL(`${ORIGIN}${PATH}${query ? `?${query}` : ''}`);
  const t = Math.floor((options.at ?? Date.now()) / 1000);
  const digest = createHmac('sha256', options.secret ?? SECRET).update(`${t}.GET ${url.pathname}?${canonicalFeedQuery(url.searchParams)}`).digest('hex');
  return new NextRequest(url, { headers: { 'x-foxes-feed-signature': `t=${t},v1=${digest}` } });
}

async function read(query: string) {
  const response = await GET(signed(query));
  return { status: response.status, body: await response.json(), headers: response.headers };
}

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri(), { autoIndex: false });
});
afterAll(async () => { await mongoose.disconnect(); await server?.stop(); });
beforeEach(async () => {
  process.env.BOOKING_FEED_SECRET = SECRET;
  await Promise.all([Booking.collection.deleteMany({}), Tour.collection.deleteMany({}), User.collection.deleteMany({})]);
});

let refSeq = 0;
async function booking(overrides: Record<string, unknown> = {}) {
  refSeq += 1;
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    tenantId: 'default',
    bookingReference: `EEO-QA-${String(refSeq).padStart(4, '0')}`,
    tour: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    date: new Date('2026-11-12T12:00:00.000Z'),
    dateString: '2026-11-12',
    time: '08:30',
    guests: 2,
    adultGuests: 2,
    totalPrice: 100,
    currency: 'USD',
    status: 'Confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    amountPaid: 100,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date(Date.now() - 3_600_000 + refSeq * 1000),
    ...overrides,
  };
  await Booking.collection.insertOne(doc as any);
  return doc;
}

describe('who may read the feed', () => {
  it('answers only the signed consumer, and never says why it refused', async () => {
    await booking();
    const unsigned = await GET(new NextRequest(new URL(`${ORIGIN}${PATH}?limit=5`)));
    expect(unsigned.status).toBe(401);
    expect(await unsigned.json()).toEqual({ success: false, error: 'Unauthorized' });
    expect((await GET(signed('limit=5', { secret: `${SECRET}x` }))).status).toBe(401);
    expect((await GET(signed('limit=5', { at: Date.now() - 10 * 60_000 }))).status).toBe(401);
    // A signature for one query does not open another.
    const request = signed('limit=5');
    const tampered = new NextRequest(new URL(`${ORIGIN}${PATH}?limit=6`), { headers: request.headers });
    expect((await GET(tampered)).status).toBe(401);
    delete process.env.BOOKING_FEED_SECRET;
    expect((await GET(signed('limit=5'))).status).toBe(503);
  });

  it('refuses a malformed request from the signed consumer with the field it did not understand', async () => {
    const res = await read('limit=500');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Invalid request', field: 'limit' });
  });
});

describe('reading changes', () => {
  it('pages through every change to the tail, oldest first, and starts where it left off', async () => {
    const tour = await Tour.collection.insertOne({ title: 'Giza Pyramids half-day tour', tenantId: 'default' } as any);
    const user = await User.collection.insertOne({ firstName: 'QA', lastName: 'Guest', email: 'qa-guest@example.invalid', phone: '+201000000000' } as any);
    const created: string[] = [];
    for (let n = 0; n < 5; n += 1) created.push((await booking({ tour: tour.insertedId, user: user.insertedId })).bookingReference as string);
    const first = await read('limit=2&since=2000-01-01T00:00:00.000Z');
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(first.body.data.items).toHaveLength(2);
    expect(first.body.data.hasMore).toBe(true);
    expect(first.body.data.items[0]).toMatchObject({
      source: 'eeo', externalRef: created[0], status: 'confirmed', paymentStatus: 'paid',
      tour: { name: 'Giza Pyramids half-day tour', code: String(tour.insertedId) },
      customer: { name: 'QA Guest', email: 'qa-guest@example.invalid', phone: '+201000000000' },
    });
    const seen = [...first.body.data.items.map((item: any) => item.externalRef)];
    let cursor = first.body.data.nextCursor;
    for (;;) {
      const page = await read(`limit=2&cursor=${cursor}`);
      seen.push(...page.body.data.items.map((item: any) => item.externalRef));
      cursor = page.body.data.nextCursor;
      if (!page.body.data.hasMore) break;
    }
    expect(seen).toEqual(created);
    // Nothing new: an empty page keeps the position it was asked from.
    const quiet = await read(`limit=2&cursor=${cursor}`);
    expect(quiet.body.data).toEqual({ items: [], hasMore: false, nextCursor: cursor });
    // A later change appears after that position.
    const later = await booking({ updatedAt: new Date(Date.now() - 60_000) });
    expect((await read(`limit=2&cursor=${cursor}`)).body.data.items.map((item: any) => item.externalRef)).toEqual([later.bookingReference]);
  });

  it('waits a few seconds before reading a change, so a write still landing is not skipped', async () => {
    await booking({ updatedAt: new Date(Date.now() - 2_000) });
    expect((await read('since=2000-01-01T00:00:00.000Z')).body.data.items).toEqual([]);
  });

  it('sends only this site’s bookings, and never joins another site’s tour', async () => {
    const otherTour = await Tour.collection.insertOne({ title: 'Another site tour', tenantId: 'sharm-excursions-online' } as any);
    await booking({ tenantId: 'sharm-excursions-online', bookingReference: 'SEO-QA-1' });
    await booking({ tour: otherTour.insertedId, bookingReference: 'EEO-QA-CROSS' });
    await booking({ tenantId: null, bookingReference: 'EEO-QA-LEGACY' });
    const res = await read('since=2000-01-01T00:00:00.000Z');
    const refs = res.body.data.items.map((item: any) => item.externalRef);
    expect(refs).toEqual(['EEO-QA-CROSS', 'EEO-QA-LEGACY']);
    expect(res.body.data.items[0].tour).toEqual({ name: 'Tour no longer listed', code: String(otherTour.insertedId), option: null });
    expect(JSON.stringify(res.body)).not.toContain('Another site tour');
  });
});

describe('reading a service-day window', () => {
  it('returns the bookings of exactly those days, by day, to the last page', async () => {
    await booking({ dateString: '2026-11-11', date: new Date('2026-11-11T22:30:00.000Z'), bookingReference: 'EEO-QA-BEFORE' });
    await booking({ dateString: '2026-11-12', date: new Date('2026-11-12T12:00:00.000Z'), bookingReference: 'EEO-QA-DAY1' });
    await booking({ dateString: '2026-11-13', date: new Date('2026-11-13T03:00:00.000Z'), bookingReference: 'EEO-QA-DAY2' });
    await booking({ dateString: '2026-11-14', date: new Date('2026-11-14T00:30:00.000Z'), bookingReference: 'EEO-QA-AFTER' });
    const first = await read('serviceFrom=2026-11-12&serviceTo=2026-11-13&limit=2');
    const second = await read(`serviceFrom=2026-11-12&serviceTo=2026-11-13&limit=2&cursor=${first.body.data.nextCursor}`);
    const refs = [...first.body.data.items, ...second.body.data.items].map((item: any) => item.externalRef);
    expect(refs).toEqual(['EEO-QA-DAY1', 'EEO-QA-DAY2']);
    expect(second.body.data.hasMore).toBe(false);
  });
});

describe('what the feed never does', () => {
  it('logs nothing about a guest when the database fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const find = jest.spyOn(Booking, 'find').mockImplementationOnce(() => { throw new Error('qa-guest@example.invalid could not be read'); });
    const res = await read('since=2000-01-01T00:00:00.000Z');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ success: false, error: 'Feed unavailable' });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('example.invalid');
    find.mockRestore();
    spy.mockRestore();
  });
});
