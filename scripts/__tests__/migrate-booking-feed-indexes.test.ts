/** @jest-environment node */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ensureBookingFeedIndexes } from '../migrate-booking-feed-indexes';

let server: MongoMemoryServer;
beforeAll(async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri(), { autoIndex: false });
});
afterAll(async () => { await mongoose.disconnect(); await server?.stop(); });
beforeEach(async () => { await mongoose.connection.db!.dropDatabase(); });

const bookings = () => mongoose.connection.db!.collection('bookings');

describe('booking feed index migration', () => {
  it('only reports on a dry run, creates on apply, and changes nothing the second time', async () => {
    await bookings().insertOne({ bookingReference: 'EEO-QA-1', updatedAt: new Date(), date: new Date() });
    expect(await ensureBookingFeedIndexes(bookings(), false)).toEqual([
      { name: 'booking_feed_changes', state: 'missing' },
      { name: 'booking_feed_window', state: 'missing' },
    ]);
    expect((await bookings().indexes()).map((index) => index.name)).toEqual(['_id_']);
    expect(await ensureBookingFeedIndexes(bookings(), true)).toEqual([
      { name: 'booking_feed_changes', state: 'created' },
      { name: 'booking_feed_window', state: 'created' },
    ]);
    expect(await ensureBookingFeedIndexes(bookings(), true)).toEqual([
      { name: 'booking_feed_changes', state: 'present' },
      { name: 'booking_feed_window', state: 'present' },
    ]);
  });

  it('reuses an index that already has the key, and stops on a same-name index with another key', async () => {
    await bookings().createIndex({ updatedAt: 1, _id: 1 }, { name: 'legacy_updated' });
    await bookings().createIndex({ date: -1 }, { name: 'booking_feed_window' });
    await expect(ensureBookingFeedIndexes(bookings(), true)).rejects.toThrow('booking_feed_window exists with a different key');
    await bookings().dropIndex('booking_feed_window');
    expect(await ensureBookingFeedIndexes(bookings(), true)).toEqual([
      { name: 'booking_feed_changes', state: 'present_as', existingName: 'legacy_updated' },
      { name: 'booking_feed_window', state: 'created' },
    ]);
  });
});
