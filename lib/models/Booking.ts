// lib/models/Booking.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  tour: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  date: Date;
  time: string;
  guests: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  paymentId?: string;
  paymentMethod?: string;
  specialRequests?: string;
  emergencyContact?: string;
  // Additional guest breakdown
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  // Selected add-ons
  selectedAddOns?: { [key: string]: number };
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
    min: 1,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['Confirmed', 'Pending', 'Cancelled'],
    default: 'Confirmed',
  },
  paymentId: {
    type: String,
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'bank', 'cash'],
    default: 'card',
  },
  specialRequests: {
    type: String,
    maxlength: 1000,
  },
  emergencyContact: {
    type: String,
    maxlength: 200,
  },
  // Guest breakdown
  adultGuests: {
    type: Number,
    min: 0,
    default: 1,
  },
  childGuests: {
    type: Number,
    min: 0,
    default: 0,
  },
  infantGuests: {
    type: Number,
    min: 0,
    default: 0,
  },
  // Selected add-ons as key-value pairs (addOnId: quantity)
  selectedAddOns: {
    type: Map,
    of: Number,
    default: new Map(),
  },
}, { 
  timestamps: true,
  // Enable virtuals when converting to JSON
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for guest breakdown text
BookingSchema.virtual('guestBreakdown').get(function() {
  const parts = [];
  if (this.adultGuests > 0) parts.push(`${this.adultGuests} adult${this.adultGuests > 1 ? 's' : ''}`);
  if (this.childGuests > 0) parts.push(`${this.childGuests} child${this.childGuests > 1 ? 'ren' : ''}`);
  if (this.infantGuests > 0) parts.push(`${this.infantGuests} infant${this.infantGuests > 1 ? 's' : ''}`);
  return parts.join(', ');
});

// Index for efficient queries
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ tour: 1, date: 1 });
BookingSchema.index({ status: 1 });

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;