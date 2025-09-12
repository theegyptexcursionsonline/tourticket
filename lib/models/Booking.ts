import mongoose, { Document, Schema, models } from 'mongoose';

export interface IBooking extends Document {
  tourId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  date: Date;
  time: string;
  guests: number;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  bookingReference: string;
  createdAt: Date;
}

const BookingSchema: Schema = new Schema({
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['confirmed', 'pending', 'cancelled', 'completed'], default: 'pending' },
  bookingReference: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

export default models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);