// lib/models/Tour.ts
import mongoose, { Document, Schema, Model } from 'mongoose';
import './Review'; // Add this line to register the Review model

// --- New Interface for Availability Slots ---
export interface IAvailabilitySlot {
  time: string; // e.g., "09:00 AM"
  capacity: number; // Max number of guests for this slot
}

// --- New Interface for Availability Rules ---
export interface IAvailability extends Document {
  type: 'daily' | 'date_range' | 'specific_dates';
  // For 'daily'
  availableDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  // For 'date_range'
  startDate?: Date;
  endDate?: Date;
  // For 'specific_dates'
  specificDates?: Date[];
  // For all types
  slots: IAvailabilitySlot[];
  // To block out specific dates within a range or daily rule
  blockedDates?: Date[]; 
}

// --- Main Tour Interface ---
export interface ITour extends Document {
  title: string;
  slug: string;
  destination: mongoose.Schema.Types.ObjectId;
  category: mongoose.Schema.Types.ObjectId;
  description: string;
  price: number;
  discountPrice?: number;
  duration: string;
    image: string; // <-- ADD THIS LINE

  images: string[];
  includes: string[];
  highlights: string[];
  faq: { question: string; answer: string }[];
  isFeatured: boolean;
  reviews: mongoose.Schema.Types.ObjectId[];
  availability: IAvailability; // --- ADDED THIS FIELD ---
}

// --- New Schemas for Availability ---
const AvailabilitySlotSchema = new Schema<IAvailabilitySlot>({
  time: { type: String, required: true },
  capacity: { type: Number, required: true, min: 0 },
}, { _id: false });

const AvailabilitySchema = new Schema<IAvailability>({
  type: {
    type: String,
    enum: ['daily', 'date_range', 'specific_dates'],
    required: true,
    default: 'daily',
  },
  availableDays: {
    type: [Number], // 0-6 for Sun-Sat
    default: [0, 1, 2, 3, 4, 5, 6], // Default to all days
  },
  startDate: Date,
  endDate: Date,
  specificDates: [Date],
  slots: {
    type: [AvailabilitySlotSchema],
    required: true,
    default: [{ time: '10:00 AM', capacity: 10 }], // Add a default slot
  },
  blockedDates: [Date],
});


// --- Main Tour Schema ---
const TourSchema: Schema<ITour> = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  discountPrice: { type: Number },
  duration: { type: String, required: true },
    image: { type: String }, // <-- ADD THIS LINE

  images: [{ type: String }],
  includes: [{ type: String }],
  highlights: [{ type: String }],
  faq: [{ question: String, answer: String }],
  isFeatured: { type: Boolean, default: false },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  availability: { type: AvailabilitySchema, required: true, default: () => ({}) }, // --- ADDED THIS FIELD ---
}, { timestamps: true });

const Tour: Model<ITour> = mongoose.models.Tour || mongoose.model<ITour>('Tour', TourSchema);

export default Tour;