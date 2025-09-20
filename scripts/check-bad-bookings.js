// scripts/check-bad-bookings.js
import dbConnect from '../lib/dbConnect';
import Booking from '../lib/models/Booking';
import mongoose from 'mongoose';

async function run() {
  await dbConnect();
  const cnt = await Booking.countDocuments({
    $or: [
      { bookingReference: { $exists: false } },
      { bookingReference: null },
      { bookingReference: '' }
    ]
  });
  console.log('bookings missing/empty bookingReference:', cnt);
  mongoose.disconnect();
}
run().catch(e => { console.error(e); mongoose.disconnect(); process.exit(1); });
