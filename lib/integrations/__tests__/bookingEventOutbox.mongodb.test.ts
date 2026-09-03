/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import mongoose from 'mongoose';
import Booking from '@/lib/models/Booking';
import User from '@/lib/models/user';
import Tour from '@/lib/models/Tour';
import FoxesConnectBookingEventModel from '@/lib/models/FoxesConnectBookingEvent';
import {
  enqueueBookingEvent,
  processBookingEventOutbox,
} from '@/lib/integrations/bookingEventOutbox';
import { reconcileBookingEventOutbox } from '@/lib/integrations/bookingEventMaintenance';
import {
  createPersistedBookingEvent,
  enqueuePersistedBookingEvent,
} from '@/lib/integrations/bookingEventProducers';
import { createBookingLifecycleEvent } from '@/lib/integrations/foxesConnectBookingEvents';

const mongoUri = process.env.BOOKING_EVENTS_TEST_MONGODB_URI;
const describeWithMongo = mongoUri ? describe : describe.skip;
const env = {
  NODE_ENV: 'test',
  FOXESCONNECT_BOOKING_EVENTS_URL: 'https://support.example.test/api/integrations/booking-events',
  FOXESCONNECT_WORKSPACE_KEY: 'eeo-production',
  FOXESCONNECT_BOOKING_EVENTS_SECRET: '0123456789abcdef0123456789abcdef',
} as NodeJS.ProcessEnv;

function bookingRow(input: {
  id?: mongoose.Types.ObjectId;
  reference: string;
  tenantId?: string;
  status?: string;
  paymentStatus?: string;
  paymentConfirmedAt?: Date;
  dateString?: string;
  time?: string;
  user?: mongoose.Types.ObjectId;
  tour?: mongoose.Types.ObjectId;
}) {
  return {
    _id: input.id || new mongoose.Types.ObjectId(),
    tenantId: input.tenantId || 'default',
    bookingReference: input.reference,
    tour: input.tour || new mongoose.Types.ObjectId(),
    user: input.user || new mongoose.Types.ObjectId(),
    date: new Date(`${input.dateString || '2026-09-05'}T12:00:00.000Z`),
    dateString: input.dateString || '2026-09-05',
    time: input.time || '10:00',
    guests: 1,
    totalPrice: 100,
    currency: 'USD',
    status: input.status || 'Confirmed',
    paymentStatus: input.paymentStatus || 'paid',
    paymentConfirmedAt: input.paymentConfirmedAt,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-03T06:30:00.000Z'),
  };
}

describeWithMongo('FoxesConnect booking-event real Mongo invariants', () => {
  beforeAll(async () => {
    await mongoose.connect(mongoUri!, { serverSelectionTimeoutMS: 5_000 });
    await FoxesConnectBookingEventModel.syncIndexes();
  });

  beforeEach(async () => {
    await Promise.all([
      Booking.collection.deleteMany({}),
      FoxesConnectBookingEventModel.collection.deleteMany({}),
      User.collection.deleteMany({}),
      Tour.collection.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('deduplicates concurrent inserts and gives one worker the delivery lease', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const confirmedAt = new Date('2026-09-03T06:30:00.000Z');
    await Booking.collection.insertOne(bookingRow({
      id: bookingId,
      reference: 'EEO-CONCURRENT',
      paymentConfirmedAt: confirmedAt,
    }));
    const event = createBookingLifecycleEvent({
      type: 'booking_confirmed',
      bookingId: String(bookingId),
      occurredAt: confirmedAt,
    });

    await Promise.all(Array.from({ length: 20 }, () => enqueueBookingEvent({
      event,
      bookingId: String(bookingId),
      eventVersion: 'v1',
    })));
    await expect(FoxesConnectBookingEventModel.countDocuments({ eventId: event.eventId })).resolves.toBe(1);

    const fetchImpl = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return new Response(null, { status: 200 });
    });
    const results = await Promise.all([
      processBookingEventOutbox({ env, fetchImpl, limit: 1 }),
      processBookingEventOutbox({ env, fetchImpl, limit: 1 }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(results.reduce((sum, item) => sum + item.delivered, 0)).toBe(1);
    await expect(FoxesConnectBookingEventModel.findById(event.eventId).lean())
      .resolves.toMatchObject({ status: 'delivered', attempts: 1 });
  });

  it('retains an ambiguous network outcome and never auto-fetches it again', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const confirmedAt = new Date('2026-09-03T06:30:00.000Z');
    await Booking.collection.insertOne(bookingRow({
      id: bookingId,
      reference: 'EEO-UNCERTAIN',
      paymentConfirmedAt: confirmedAt,
    }));
    const event = createBookingLifecycleEvent({
      type: 'booking_confirmed',
      bookingId: String(bookingId),
      occurredAt: confirmedAt,
    });
    await enqueueBookingEvent({ event, bookingId: String(bookingId), eventVersion: 'v1' });

    const ambiguousFetch = jest.fn().mockRejectedValue(new Error('connection reset'));
    await expect(processBookingEventOutbox({ env, fetchImpl: ambiguousFetch, limit: 1 }))
      .resolves.toMatchObject({ uncertain: 1 });
    const replayFetch = jest.fn();
    await processBookingEventOutbox({ env, fetchImpl: replayFetch, limit: 1 });
    expect(ambiguousFetch).toHaveBeenCalledTimes(1);
    expect(replayFetch).not.toHaveBeenCalled();
    await expect(FoxesConnectBookingEventModel.findById(event.eventId).lean())
      .resolves.toMatchObject({ status: 'uncertain', lastErrorCode: 'DELIVERY_OUTCOME_UNCERTAIN' });
  });

  it('filters reminder due-time before limiting and excludes a named tenant', async () => {
    const now = new Date('2026-09-03T07:00:00.000Z'); // 10:00 in Cairo
    const past = Array.from({ length: 6 }, (_, index) => bookingRow({
      reference: `EEO-PAST-${index}`,
      dateString: '2026-09-03',
      time: `0${index + 1}:00`,
    }));
    const dueDefault = bookingRow({
      reference: 'EEO-DUE',
      dateString: '2026-09-03',
      time: '20:00',
    });
    const dueNamedTenant = bookingRow({
      reference: 'OTHER-DUE',
      tenantId: 'other-brand',
      dateString: '2026-09-03',
      time: '21:00',
    });
    await Booking.collection.insertMany([...past, dueDefault, dueNamedTenant]);

    await expect(reconcileBookingEventOutbox({ now, limit: 2 })).resolves.toMatchObject({
      enqueued: 1,
      failed: 0,
    });
    const reminders = await FoxesConnectBookingEventModel.find({ type: 'service_reminder_24h' }).lean();
    expect(reminders).toHaveLength(1);
    expect(reminders[0].bookingId).toBe(String(dueDefault._id));
    expect(reminders[0].eventId).not.toContain(String(dueNamedTenant._id));
    await expect(enqueuePersistedBookingEvent({
      type: 'service_reminder_24h',
      booking: dueNamedTenant,
    })).rejects.toMatchObject({ code: 'BOOKING_EVENT_TENANT_FORBIDDEN' });
    await expect(FoxesConnectBookingEventModel.countDocuments({ bookingId: String(dueNamedTenant._id) }))
      .resolves.toBe(0);
  });

  it('freezes post-update Confirmed state for every item in a multi-booking payment', async () => {
    const confirmedAt = new Date('2026-09-03T06:30:00.000Z');
    const rows = [0, 1].map((index) => bookingRow({
      reference: `EEO-MULTI-${index}`,
      status: 'Pending',
      paymentStatus: 'paid',
    }));
    await Booking.collection.insertMany(rows);
    await Booking.updateMany(
      { _id: { $in: rows.map((row) => row._id) }, status: 'Pending' },
      [{ $set: {
        status: 'Confirmed',
        paymentStatus: 'paid',
        paymentConfirmedAt: { $ifNull: ['$paymentConfirmedAt', confirmedAt] },
      } }],
    );

    const durable = await Booking.find({ _id: { $in: rows.map((row) => row._id) } }).sort({ _id: 1 });
    expect(durable).toHaveLength(2);
    for (const booking of durable) {
      const event = createPersistedBookingEvent({ type: 'booking_confirmed', booking });
      expect(event.data).toMatchObject({ bookingStatus: 'Confirmed', paymentStatus: 'paid' });
      expect(event.occurredAt).toBe(confirmedAt.toISOString());
    }
  });

  it('loads the available durable customer name and tour title into the queued payload', async () => {
    const userId = new mongoose.Types.ObjectId();
    const tourId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();
    const confirmedAt = new Date('2026-09-03T06:30:00.000Z');
    await User.collection.insertOne({
      _id: userId,
      firstName: 'QA',
      lastName: 'Customer',
      phone: '+20 100 000 0000',
      email: 'qa@example.test',
    });
    await Tour.collection.insertOne({ _id: tourId, title: 'Durable Tour Title' });
    await Booking.collection.insertOne(bookingRow({
      id: bookingId,
      reference: 'EEO-CONTEXT',
      paymentConfirmedAt: confirmedAt,
      user: userId,
      tour: tourId,
    }));
    const booking = await Booking.findById(bookingId);

    await enqueuePersistedBookingEvent({ type: 'booking_confirmed', booking: booking! });

    const stored = await FoxesConnectBookingEventModel.findOne({ bookingId: String(bookingId) }).lean();
    const payload = JSON.parse(stored!.rawBody);
    expect(payload.customer).toMatchObject({ name: 'QA Customer', phone: '+20 100 000 0000' });
    expect(payload.customer).not.toHaveProperty('locale');
    expect(payload.data).toMatchObject({ tourTitle: 'Durable Tour Title' });
  });
});
