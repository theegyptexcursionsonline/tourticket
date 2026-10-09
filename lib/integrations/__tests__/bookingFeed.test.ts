/** @jest-environment node */
import mongoose from 'mongoose';
import {
  FeedRequestError,
  canonicalFeedQuery,
  parseFeedRequest,
  toFeedItem,
  verifyFeedSignature,
  type FeedBookingRow,
} from '@/lib/integrations/bookingFeed';

// The same vectors are pinned in the Foxes booking API's signature tests (the signing end), so
// both ends are held to one written rule rather than to each other's code.
const SECRET = 'feed-vector-secret-0123456789-abcdefghij';
const T = 1791554400;
const PATH = '/api/internal/booking-feed';
const CHANGES = new URLSearchParams('limit=100&since=2026-10-09T08:00:00.000Z');
const WINDOW = new URLSearchParams('serviceTo=2026-12-09&cursor=eyJkIjoiMjAyNi0xMC0xMCJ9&serviceFrom=2026-10-09&limit=100');
const CHANGES_HEADER = 't=1791554400,v1=5c61c577d2bdb81cad961f489f122387e0b68f110fd4d74a57711eea2a8c4d28';
const WINDOW_HEADER = 't=1791554400,v1=77436b6fee42572420a56150091869cea76094928094a0445230d70553a687b5';

describe('feed request signature', () => {
  it('accepts the agreed vectors, whatever order the query was written in', () => {
    expect(verifyFeedSignature(SECRET, CHANGES_HEADER, 'GET', PATH, CHANGES, T)).toBe(true);
    expect(verifyFeedSignature(SECRET, WINDOW_HEADER, 'GET', PATH, WINDOW, T + 120)).toBe(true);
    expect(canonicalFeedQuery(WINDOW)).toBe('cursor=eyJkIjoiMjAyNi0xMC0xMCJ9&limit=100&serviceFrom=2026-10-09&serviceTo=2026-12-09');
  });

  it('refuses anything that is not exactly this request, signed recently, with this secret', () => {
    expect(verifyFeedSignature(SECRET, CHANGES_HEADER, 'GET', PATH, CHANGES, T + 301)).toBe(false);
    expect(verifyFeedSignature(SECRET, CHANGES_HEADER, 'GET', PATH, CHANGES, T - 301)).toBe(false);
    expect(verifyFeedSignature(`${SECRET} `, CHANGES_HEADER, 'GET', PATH, CHANGES, T)).toBe(false);
    expect(verifyFeedSignature(SECRET, CHANGES_HEADER, 'GET', `${PATH}/`, CHANGES, T)).toBe(false);
    expect(verifyFeedSignature(SECRET, CHANGES_HEADER, 'GET', PATH, new URLSearchParams('limit=99&since=2026-10-09T08:00:00.000Z'), T)).toBe(false);
    expect(verifyFeedSignature(SECRET, WINDOW_HEADER, 'GET', PATH, CHANGES, T)).toBe(false);
    expect(verifyFeedSignature('short', CHANGES_HEADER, 'GET', PATH, CHANGES, T)).toBe(false);
    for (const header of [null, '', 'Bearer x', `t=${T}`, `t=${T},v1=${'a'.repeat(63)}`, `${CHANGES_HEADER},extra`]) {
      expect(verifyFeedSignature(SECRET, header, 'GET', PATH, CHANGES, T)).toBe(false);
    }
  });
});

describe('feed request parameters', () => {
  const parse = (query: string) => parseFeedRequest(new URLSearchParams(query));
  const refused = (query: string) => {
    try {
      parse(query);
    } catch (error) {
      return error instanceof FeedRequestError ? error.field : 'other';
    }
    return null;
  };

  it('reads changes since a time or a cursor, and a service-day window', () => {
    expect(parse('since=2026-10-09T08:00:00.000Z')).toMatchObject({ mode: 'changes', limit: 100 });
    expect(parse('limit=5')).toMatchObject({ mode: 'changes', limit: 5, since: null, after: null });
    const cursor = Buffer.from(JSON.stringify({ a: '2026-10-09T08:00:00.000Z', i: new mongoose.Types.ObjectId().toString() })).toString('base64url');
    expect(parse(`cursor=${cursor}`).after?.at.toISOString()).toBe('2026-10-09T08:00:00.000Z');
    expect(parse('serviceFrom=2026-10-09&serviceTo=2026-12-08')).toMatchObject({ mode: 'window', serviceFrom: '2026-10-09', serviceTo: '2026-12-08' });
  });

  it('refuses unknown, repeated, mixed and impossible parameters', () => {
    expect(refused('tenant=sharm')).toBe('tenant');
    expect(refused('limit=1&limit=2')).toBe('limit');
    expect(refused('limit=0')).toBe('limit');
    expect(refused('limit=101')).toBe('limit');
    expect(refused('since=yesterday')).toBe('since');
    expect(refused('cursor=not-json')).toBe('cursor');
    expect(refused('serviceFrom=2026-02-30&serviceTo=2026-03-01')).toBe('serviceFrom');
    expect(refused('serviceFrom=2026-10-09&serviceTo=2027-10-09')).toBe('serviceTo');
    expect(refused('serviceFrom=2026-10-09&serviceTo=2026-10-08')).toBe('serviceTo');
    expect(refused('serviceFrom=2026-10-09&serviceTo=2026-10-10&since=2026-10-09T08:00:00.000Z')).toBe('since');
  });
});

const row = (overrides: Partial<FeedBookingRow> = {}): FeedBookingRow => ({
  _id: new mongoose.Types.ObjectId('6704f0c2a1b2c3d4e5f60718'),
  bookingReference: 'EEO-QA-1001',
  date: new Date('2026-10-12T12:00:00.000Z'),
  dateString: '2026-10-12',
  time: '08:30',
  guests: 3,
  adultGuests: 2,
  childGuests: 1,
  infantGuests: 0,
  totalPrice: 180,
  currency: 'USD',
  status: 'Confirmed',
  paymentStatus: 'paid',
  paymentMethod: 'card',
  amountPaid: 180,
  customerPhone: '+201000000000',
  hotelPickupLocation: { name: 'QA Hotel' },
  selectedBookingOption: { title: 'Private, English guide' },
  updatedAt: new Date('2026-10-10T07:55:00.000Z'),
  user: { firstName: 'QA', lastName: 'Guest', email: 'qa-guest@example.invalid' },
  tour: { _id: new mongoose.Types.ObjectId('6704f0c2a1b2c3d4e5f60799'), title: 'Giza Pyramids half-day tour' },
  ...overrides,
});

describe('an EEO booking as a feed item', () => {
  it('speaks the agreed vocabulary', () => {
    expect(toFeedItem(row())).toEqual({
      source: 'eeo',
      externalRef: 'EEO-QA-1001',
      sourceBookingId: '6704f0c2a1b2c3d4e5f60718',
      sourceSite: null,
      status: 'confirmed',
      paymentStatus: 'paid',
      tour: { name: 'Giza Pyramids half-day tour', code: '6704f0c2a1b2c3d4e5f60799', option: 'Private, English guide' },
      serviceDate: '2026-10-12',
      serviceTime: '08:30',
      timezone: 'Africa/Cairo',
      guests: { total: 3, breakdown: [{ label: 'Adult', count: 2 }, { label: 'Child', count: 1 }] },
      amount: { value: '180.00', currency: 'USD' },
      customer: { name: 'QA Guest', email: 'qa-guest@example.invalid', phone: '+201000000000', locale: null },
      pickup: { hotel: 'QA Hotel', room: null, time: null },
      collect: null,
      updatedAt: '2026-10-10T07:55:00.000Z',
    });
  });

  it.each([
    ['Confirmed', 'paid', 180, 0, 'confirmed', 'paid'],
    ['Pending', 'pending', 0, 0, 'pending', 'unpaid'],
    ['Pending', 'pending', 50, 0, 'pending', 'partially_paid'],
    ['Completed', 'paid', 180, 0, 'completed', 'paid'],
    ['Cancelled', 'paid', 180, 0, 'cancelled', 'paid'],
    ['Cancelled', 'paid', 180, 90, 'cancelled', 'partially_refunded'],
    ['Refunded', 'paid', 180, 180, 'cancelled', 'refunded'],
    ['Partial_Refund', 'paid', 180, 40, 'confirmed', 'partially_refunded'],
  ])('%s, %s, paid %d, refunded %d → %s / %s', (status, paymentStatus, amountPaid, refundAmount, expectedStatus, expectedPayment) => {
    expect(toFeedItem(row({ status, paymentStatus, amountPaid, refundAmount }))).toMatchObject({ status: expectedStatus, paymentStatus: expectedPayment });
  });

  it('passes an unknown status on unchanged, so the booking API keeps the last good state', () => {
    expect(toFeedItem(row({ status: 'On_Hold' }))).toMatchObject({ status: 'on_hold' });
  });

  it('reports a duplicate charge record as cancelled, never as a second booking', () => {
    expect(toFeedItem(row({ duplicateOf: new mongoose.Types.ObjectId() }))).toMatchObject({ status: 'cancelled' });
    expect(toFeedItem(row({ paymentReconciliationState: 'duplicate_suppressed' }))).toMatchObject({ status: 'cancelled', collect: null });
  });

  it('tells operations what to collect on the day only for an unpaid cash booking', () => {
    expect(toFeedItem(row({ paymentMethod: 'cash', paymentStatus: 'pending', amountPaid: 50, status: 'Pending' }))).toMatchObject({ collect: { value: '130.00', currency: 'USD' } });
    expect(toFeedItem(row({ paymentMethod: 'bank', paymentStatus: 'pending', amountPaid: 0, status: 'Pending' }))).toMatchObject({ collect: null });
    expect(toFeedItem(row({ paymentMethod: 'cash', paymentStatus: 'paid', amountPaid: 180 }))).toMatchObject({ collect: null });
    expect(toFeedItem(row({ paymentMethod: 'cash', paymentStatus: 'pending', amountPaid: 0, status: 'Cancelled' }))).toMatchObject({ collect: null });
    expect(toFeedItem(row({ paymentMethod: 'cash', paymentStatus: 'pending', amountPaid: 0, currency: 'JPY', totalPrice: 12000 }))).toMatchObject({ amount: { value: '12000', currency: 'JPY' }, collect: { value: '12000', currency: 'JPY' } });
  });

  it('never corrupts a contact detail and never sends control characters', () => {
    const item = toFeedItem(row({
      customerPhone: '+20 100 000 0000 ext. 1234 (front desk, ask for QA)',
      user: { firstName: 'QA\u0000', lastName: 'Guest\n', email: `${'a'.repeat(250)}@example.invalid` },
      hotelPickupLocation: null,
      hotelPickupDetails: 'QA\tHotel',
    })) as any;
    expect(item.customer).toEqual({ name: 'QA Guest', email: null, phone: null, locale: null });
    expect(item.pickup.hotel).toBe('QA Hotel');
  });

  it('sends the party total alone when the breakdown does not add up, and keeps a listed-out tour’s id', () => {
    expect(toFeedItem(row({ guests: 4, adultGuests: 2, childGuests: 1 }))).toMatchObject({ guests: { total: 4 } });
    expect((toFeedItem(row({ guests: 4, adultGuests: 2, childGuests: 1 })) as any).guests.breakdown).toBeUndefined();
    const tourId = new mongoose.Types.ObjectId();
    expect(toFeedItem(row({ tour: null, tourId }))).toMatchObject({ tour: { name: 'Tour no longer listed', code: String(tourId) } });
  });

  it('cannot identify a booking without a reference or a change time', () => {
    expect(toFeedItem(row({ bookingReference: '  ' }))).toBeNull();
    expect(toFeedItem(row({ updatedAt: null }))).toBeNull();
  });
});
