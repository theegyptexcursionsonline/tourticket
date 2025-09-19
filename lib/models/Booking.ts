// lib/models/Booking.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  tour: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  date: Date; // Keep as 'date' for database
  time: string; // Keep as 'time' for database
  guests: number; // Keep as 'guests' for database
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema<IBooking> = new Schema({
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  guests: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Confirmed', 'Pending', 'Cancelled'],
    default: 'Confirmed',
  },
}, { timestamps: true });

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;