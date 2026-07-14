import mongoose from 'mongoose';
import Tour from '../lib/models/Tour';
import Booking from '../lib/models/Booking';
import CheckoutInventoryHold from '../lib/models/CheckoutInventoryHold';
import CheckoutInventoryLease from '../lib/models/CheckoutInventoryLease';
import {
  bindInventoryHoldsToPayment,
  convertInventoryHold,
  createInventoryHolds,
  ensureInventoryHoldsForPayment,
  releaseInventoryHolds,
  withBookingInventoryCapacity,
} from '../lib/checkout/inventoryHolds';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  const uri = process.env.MONGODB_URI || '';
  const parsed = new URL(uri);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !parsed.pathname.endsWith('checkout_inventory_test')) {
    throw new Error('Inventory verification requires a local checkout_inventory_test database.');
  }

  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([
    CheckoutInventoryHold.syncIndexes(),
    CheckoutInventoryLease.syncIndexes(),
    Booking.syncIndexes(),
  ]);

  const objectId = () => new mongoose.Types.ObjectId();
  const date = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const tour = await Tour.create({
    tenantId: 'default',
    title: 'Checkout Inventory Verification Tour',
    slug: 'checkout-inventory-verification-tour',
    destination: objectId(),
    category: [objectId()],
    description: 'A sufficiently detailed isolated checkout inventory verification tour.',
    discountPrice: 100,
    revenueGuestPrices: { adult: 100, child: 50, infant: 0 },
    duration: '4 hours',
    image: 'https://example.invalid/inventory.jpg',
    availability: {
      type: 'daily',
      availableDays: [0, 1, 2, 3, 4, 5, 6],
      slots: [{ time: '10:00', capacity: 3 }, { time: '11:00', capacity: 3 }],
    },
    isPublished: false,
  });
  await Tour.updateOne({ _id: tour._id }, { $set: { isPublished: true } });

  const item = {
    _id: String(tour._id),
    selectedDate: date,
    selectedTime: '10:00',
    quantity: 2,
    childQuantity: 0,
    infantQuantity: 0,
    selectedBookingOption: { pricingKey: 'standard' },
  };
  const reservationA = 'a'.repeat(64);
  const reservationB = 'b'.repeat(64);
  const concurrent = await Promise.allSettled([
    createInventoryHolds({ reservationKey: reservationA, cart: [item] }),
    createInventoryHolds({ reservationKey: reservationB, cart: [item] }),
  ]);
  assert(concurrent.filter((result) => result.status === 'fulfilled').length === 1, 'Concurrent capacity requests did not serialize to one winner.');
  assert(concurrent.filter((result) => result.status === 'rejected').length === 1, 'Concurrent oversell was not rejected.');
  const winner = concurrent[0].status === 'fulfilled' ? reservationA : reservationB;
  const loser = winner === reservationA ? reservationB : reservationA;
  const winningHold = await CheckoutInventoryHold.findOne({ reservationKey: winner }).lean();
  assert(winningHold?.state === 'active', 'Winning hold is not active.');

  const originalExpiry = new Date(winningHold.expiresAt).getTime();
  await createInventoryHolds({ reservationKey: winner, cart: [item] });
  const replayedHold = await CheckoutInventoryHold.findOne({ reservationKey: winner }).lean();
  assert(new Date(replayedHold!.expiresAt).getTime() === originalExpiry, 'Idempotent replay incorrectly extended the hold window.');

  await releaseInventoryHolds({ reservationKey: winner, reason: 'verification_release' });
  await createInventoryHolds({ reservationKey: loser, cart: [item] });
  await CheckoutInventoryHold.updateOne(
    { reservationKey: loser },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );

  const paidReservation = 'c'.repeat(64);
  const paidItem = { ...item, quantity: 3 };
  await createInventoryHolds({ reservationKey: paidReservation, cart: [paidItem] });
  const paymentIntentId = 'pi_local_inventory_verification';
  await bindInventoryHoldsToPayment(paidReservation, paymentIntentId);
  await ensureInventoryHoldsForPayment({ paymentIntentId, reservationKey: paidReservation, cart: [paidItem] });

  const booking = await Booking.create({
    tenantId: 'default',
    bookingReference: 'EEO-INVENTORY-VERIFY',
    tour: tour._id,
    user: objectId(),
    date: new Date(`${date}T00:00:00.000Z`),
    dateString: date,
    time: '10:00',
    guests: 3,
    adultGuests: 3,
    childGuests: 0,
    infantGuests: 0,
    totalPrice: 324,
    currency: 'USD',
    status: 'Confirmed',
    paymentId: paymentIntentId,
    paymentItemIndex: 0,
    paymentMethod: 'card',
  });
  await convertInventoryHold({
    paymentIntentId,
    itemIndex: 0,
    bookingId: new mongoose.Types.ObjectId(String(booking._id)),
  });

  const converted = await CheckoutInventoryHold.findOne({ paymentIntentId }).lean();
  assert(converted?.state === 'converted', 'Paid hold did not convert to durable booking capacity.');
  const postBooking = await Promise.allSettled([
    createInventoryHolds({ reservationKey: 'd'.repeat(64), cart: [{ ...item, quantity: 1 }] }),
  ]);
  assert(postBooking[0].status === 'rejected', 'Durable booking capacity was not enforced after hold conversion.');

  const rescheduleBlocker = 'e'.repeat(64);
  await createInventoryHolds({
    reservationKey: rescheduleBlocker,
    cart: [{ ...item, selectedTime: '11:00', quantity: 1 }],
  });
  const blockedReschedule = await Promise.allSettled([
    withBookingInventoryCapacity({
      bookingId: String(booking._id),
      current: paidItem,
      next: { ...paidItem, selectedTime: '11:00' },
      work: async () => Booking.updateOne({ _id: booking._id }, { $set: { time: '11:00' } }),
    }),
  ]);
  assert(blockedReschedule[0].status === 'rejected', 'Reschedule ignored active checkout inventory.');
  const afterBlockedMove = await Booking.findById(booking._id).lean();
  assert(afterBlockedMove?.time === '10:00', 'Rejected reschedule mutated the booking.');

  await releaseInventoryHolds({ reservationKey: rescheduleBlocker, reason: 'verification_reschedule_release' });
  await withBookingInventoryCapacity({
    bookingId: String(booking._id),
    current: paidItem,
    next: { ...paidItem, selectedTime: '11:00' },
    work: async () => Booking.updateOne({ _id: booking._id }, { $set: { time: '11:00' } }),
  });
  const afterMove = await Booking.findById(booking._id).lean();
  assert(afterMove?.time === '11:00', 'Capacity-safe reschedule did not persist.');
  await createInventoryHolds({ reservationKey: 'f'.repeat(64), cart: [{ ...item, quantity: 3 }] });

  console.log(JSON.stringify({
    isolatedDatabase: parsed.pathname.slice(1),
    concurrentWinner: winner,
    concurrentRejected: true,
    idempotentExpiryPreserved: true,
    expiredHoldReleasedCapacity: true,
    paidHoldState: converted.state,
    durableCapacityEnforced: true,
    activeHoldBlockedReschedule: true,
    oldDepartureReleasedAfterReschedule: true,
  }));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
