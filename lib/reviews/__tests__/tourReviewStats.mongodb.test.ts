/** @jest-environment node */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';
import Booking from '@/lib/models/Booking';
import { computeTourReviewStats, syncTourReviewStats, syncTourReviewStatsSafely } from '@/lib/reviews/tourReviewStats';
import { planTourReviewStatsBackfill } from '@/lib/reviews/tourReviewStatsBackfill';
import { tourCardRating } from '@/lib/tours/ratingDisplay';

let server: MongoMemoryServer;
const { ObjectId } = mongoose.Types;
const past = new Date('2026-10-01T09:00:00Z');
const now = new Date('2026-11-17T09:00:00Z');

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri(), { autoIndex: false });
});
afterAll(async () => { await mongoose.disconnect(); await server?.stop(); });
beforeEach(async () => {
  await Promise.all([Review.collection.deleteMany({}), Tour.collection.deleteMany({}), Booking.collection.deleteMany({})]);
});

async function trip(tenantId?: string, extra: Record<string, unknown> = {}) {
  const _id = new ObjectId();
  await Tour.collection.insertOne({ _id, slug: `trip-${_id}`, title: 'Trip', rating: 4.5, ...(tenantId ? { tenantId } : {}), ...extra });
  return _id;
}
async function booking(tour: mongoose.Types.ObjectId, user: mongoose.Types.ObjectId, tenantId: string | undefined, status = 'Completed', date = past) {
  await Booking.collection.insertOne({ tour, user, status, date, ...(tenantId ? { tenantId } : {}) });
}
async function review(tour: mongoose.Types.ObjectId, user: mongoose.Types.ObjectId, rating: number, tenantId: string | undefined, verified = true) {
  const _id = new ObjectId();
  await Review.collection.insertOne({ _id, tour, user, rating, verified, userName: 'Guest', userEmail: 'qa@example.test', ...(tenantId ? { tenantId } : {}) });
  return _id;
}
async function customerReview(tour: mongoose.Types.ObjectId, rating: number, tenantId = 'default') {
  const user = new ObjectId();
  await booking(tour, user, tenantId);
  return review(tour, user, rating, tenantId);
}

describe('trip review figures come only from published, booking-backed reviews', () => {
  it('counts approved reviews whose writer completed a booking of the trip', async () => {
    const tour = await trip('default');
    await customerReview(tour, 5);
    await customerReview(tour, 4);
    await customerReview(tour, 4);
    expect(await computeTourReviewStats(tour, 'default', now)).toEqual({ reviewCount: 3, average: 4.3 });
  });

  it('never counts imported or sample records without a booking, however they are marked', async () => {
    const tour = await trip('default');
    await review(tour, new ObjectId(), 5, 'default', true);
    await review(tour, new ObjectId(), 5, undefined, true);
    expect(await computeTourReviewStats(tour, 'default', now)).toEqual({ reviewCount: 0, average: null });
  });

  it('leaves out hidden (unapproved) reviews and bookings that are cancelled or not yet taken', async () => {
    const tour = await trip('default');
    const hiddenUser = new ObjectId();
    await booking(tour, hiddenUser, 'default');
    await review(tour, hiddenUser, 1, 'default', false);
    const cancelled = new ObjectId();
    await booking(tour, cancelled, 'default', 'Cancelled');
    await review(tour, cancelled, 1, 'default');
    const future = new ObjectId();
    await booking(tour, future, 'default', 'Confirmed', new Date('2026-12-30T09:00:00Z'));
    await review(tour, future, 1, 'default');
    await customerReview(tour, 5);
    expect(await computeTourReviewStats(tour, 'default', now)).toEqual({ reviewCount: 1, average: 5 });
  });

  it('stays inside the trip brand: another brand reviews and bookings never count', async () => {
    const tour = await trip('makadi-bay');
    const user = new ObjectId();
    await booking(tour, user, 'el-gouna');
    await review(tour, user, 1, 'makadi-bay');
    const other = new ObjectId();
    await booking(tour, other, 'makadi-bay');
    await review(tour, other, 2, 'el-gouna');
    await customerReview(tour, 5, 'makadi-bay');
    expect(await computeTourReviewStats(tour, 'makadi-bay', now)).toEqual({ reviewCount: 1, average: 5 });
  });

  it('treats main-brand records stored before tenancy as the main brand', async () => {
    const tour = await trip(undefined);
    const user = new ObjectId();
    await booking(tour, user, undefined);
    await review(tour, user, 4, undefined);
    expect(await computeTourReviewStats(tour, 'default', now)).toEqual({ reviewCount: 1, average: 4 });
  });

  it('refuses to count without a brand', async () => {
    await expect(computeTourReviewStats(new ObjectId(), '', now)).rejects.toThrow();
  });
});

describe('syncing a trip after publish, edit, hide and remove', () => {
  it('writes the count and average, and the card shows them', async () => {
    const tour = await trip('default');
    await customerReview(tour, 5);
    await customerReview(tour, 4);
    await syncTourReviewStats(tour, { now });
    const stored = await Tour.findById(tour).lean();
    expect(stored).toMatchObject({ reviewCount: 2, rating: 4.5 });
    expect(tourCardRating(stored as never)).toBe(4.5);
  });

  it('follows an edit, a hide and a removal, ending with no score shown', async () => {
    const tour = await trip('default');
    const first = await customerReview(tour, 5);
    const second = await customerReview(tour, 3);
    await syncTourReviewStats(tour, { now });
    expect(await Tour.findById(tour).lean()).toMatchObject({ reviewCount: 2, rating: 4 });

    await Review.collection.updateOne({ _id: second }, { $set: { rating: 5 } });
    await syncTourReviewStats(tour, { now: new Date(now.getTime() + 1) });
    expect(await Tour.findById(tour).lean()).toMatchObject({ reviewCount: 2, rating: 5 });

    await Review.collection.updateOne({ _id: second }, { $set: { verified: false } });
    await syncTourReviewStats(tour, { now: new Date(now.getTime() + 2) });
    expect(await Tour.findById(tour).lean()).toMatchObject({ reviewCount: 1, rating: 5 });

    await Review.collection.deleteOne({ _id: first });
    await syncTourReviewStats(tour, { now: new Date(now.getTime() + 3) });
    const stored = await Tour.findById(tour).lean();
    expect(stored).toMatchObject({ reviewCount: 0 });
    expect(tourCardRating(stored as never)).toBeNull();
  });

  it('is idempotent: running it again writes the same figures', async () => {
    const tour = await trip('default');
    await customerReview(tour, 4);
    const a = await syncTourReviewStats(tour, { now });
    const b = await syncTourReviewStats(tour, { now });
    expect(a).toMatchObject({ reviewCount: 1, average: 4 });
    expect(b).toMatchObject({ reviewCount: 1, average: 4 });
    expect(await Tour.findById(tour).lean()).toMatchObject({ reviewCount: 1, rating: 4 });
  });

  it('an older computation finishing late cannot overwrite a newer one', async () => {
    const tour = await trip('default');
    await customerReview(tour, 5);
    await syncTourReviewStats(tour, { now: new Date(now.getTime() + 10) });
    await customerReview(tour, 1);
    // Stale run that started earlier: refused.
    await syncTourReviewStats(tour, { now });
    expect(await Tour.findById(tour).lean()).toMatchObject({ reviewCount: 1, rating: 5 });
  });

  it('a recount failure never fails the customer or admin action', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(syncTourReviewStatsSafely('not-an-id')).resolves.toBeUndefined();
    await expect(syncTourReviewStatsSafely(null)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns null for a trip that does not exist', async () => {
    expect(await syncTourReviewStats(new ObjectId(), { now })).toBeNull();
  });
});

describe('backfill', () => {
  it('is a dry run by default and writes nothing', async () => {
    const tour = await trip('default');
    await customerReview(tour, 5);
    const report = await planTourReviewStatsBackfill({ now });
    expect(report).toMatchObject({ mode: 'dry-run', written: 0, tripsWithPublishedReviews: 1 });
    expect(report.changes).toHaveLength(1);
    expect((await Tour.findById(tour).lean())?.reviewCount).toBeUndefined();
  });

  it('changes nothing when only sample records exist, and never creates a review', async () => {
    const tour = await trip('default');
    await review(tour, new ObjectId(), 5, 'default');
    const before = await Review.countDocuments({});
    const report = await planTourReviewStatsBackfill({ apply: true, now });
    expect(report).toMatchObject({ mode: 'apply', changes: [], written: 0, tripsWithPublishedReviews: 0, reviewRecordsSeen: 1 });
    expect(await Review.countDocuments({})).toBe(before);
    expect(await Tour.findById(tour).lean()).toMatchObject({ rating: 4.5 });
    expect((await Tour.findById(tour).lean())?.reviewCount).toBeUndefined();
  });

  it('applies real reviews and corrects a stale count, then has nothing left to do', async () => {
    const real = await trip('default');
    await customerReview(real, 4);
    const stale = await trip('default', { reviewCount: 7, rating: 4.9 });
    const report = await planTourReviewStatsBackfill({ apply: true, now });
    expect(report.written).toBe(2);
    expect(await Tour.findById(real).lean()).toMatchObject({ reviewCount: 1, rating: 4 });
    expect(await Tour.findById(stale).lean()).toMatchObject({ reviewCount: 0, rating: 4.9 });
    expect(tourCardRating((await Tour.findById(stale).lean()) as never)).toBeNull();
    const again = await planTourReviewStatsBackfill({ apply: true, now: new Date(now.getTime() + 1) });
    expect(again.changes).toEqual([]);
  });
});
