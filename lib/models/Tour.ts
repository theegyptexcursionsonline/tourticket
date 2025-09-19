// lib/models/Tour.ts
import mongoose, { Document, Schema, Model } from 'mongoose';
import './Review';

// Enhanced interfaces
export interface IItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  includes?: string[];
}

export interface IAvailabilitySlot {
  time: string;
  capacity: number;
}

export interface IAvailability extends Document {
  type: 'daily' | 'date_range' | 'specific_dates';
  availableDays?: number[];
  startDate?: Date;
  endDate?: Date;
  specificDates?: Date[];
  slots: IAvailabilitySlot[];
  blockedDates?: Date[];
}

export interface IFAQ {
  question: string;
  answer: string;
}

export interface IBookingOption {
  type: string;
  label: string;
  price: number;
}

export interface IAddOn {
  name: string;
  description: string;
  price: number;
}

// Complete Tour Interface
export interface ITour extends Document {
  // Basic fields
  title: string;
  slug: string;
  destination: mongoose.Schema.Types.ObjectId;
  category: mongoose.Schema.Types.ObjectId;
  description: string;
  longDescription?: string;
  price?: number;
  originalPrice?: number;
  discountPrice: number;
  duration: string;
  difficulty?: string;
  maxGroupSize?: number;
  
  // Media
  image: string;
  images?: string[];
  
  // Lists and highlights
  includes?: string[];
  highlights?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  tags?: string[];
  
  // Enhanced content - These are the missing fields!
  itinerary?: IItineraryItem[];
  faq?: IFAQ[];
  bookingOptions?: IBookingOption[];
  addOns?: IAddOn[];
  
  // Practical information - These are the missing fields!
  whatToBring?: string[];
  whatToWear?: string[];
  physicalRequirements?: string;
  accessibilityInfo?: string[];
  groupSize?: { min: number; max: number };
  transportationDetails?: string;
  mealInfo?: string;
  weatherPolicy?: string;
  photoPolicy?: string;
  tipPolicy?: string;
  healthSafety?: string[];
  culturalInfo?: string[];
  seasonalVariations?: string;
  localCustoms?: string[];
  meetingPoint?: string;
  languages?: string[];
  ageRestriction?: string;
  cancellationPolicy?: string;
  operatedBy?: string;
  
  // Status
  isFeatured?: boolean;
  isPublished?: boolean;
  
  // Relationships
  reviews?: mongoose.Schema.Types.ObjectId[];
  availability: IAvailability;
  
  // Meta
  rating?: number;
  bookings?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schemas
const ItineraryItemSchema = new Schema<IItineraryItem>({
  time: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String },
  location: { type: String },
  includes: [{ type: String }],
}, { _id: false });

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
    type: [Number],
    default: [0, 1, 2, 3, 4, 5, 6],
  },
  startDate: Date,
  endDate: Date,
  specificDates: [Date],
  slots: {
    type: [AvailabilitySlotSchema],
    required: true,
    default: [{ time: '10:00', capacity: 10 }],
  },
  blockedDates: [Date],
});

const FAQSchema = new Schema<IFAQ>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
}, { _id: false });

const BookingOptionSchema = new Schema<IBookingOption>({
  type: { type: String, required: true },
  label: { type: String, required: true },
  price: { type: Number, required: true },
}, { _id: false });

const AddOnSchema = new Schema<IAddOn>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
}, { _id: false });

// COMPLETE Tour Schema with all fields
const TourSchema: Schema<ITour> = new Schema({
  // Basic fields
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String, required: true },
  longDescription: { type: String },
  price: { type: Number },
  originalPrice: { type: Number },
  discountPrice: { type: Number, required: true },
  duration: { type: String, required: true },
  difficulty: { type: String, default: 'Easy' },
  maxGroupSize: { type: Number, default: 10 },
  
  // Media
  image: { type: String, required: true },
  images: [{ type: String }],
  
  // Lists
  includes: [{ type: String }],
  highlights: [{ type: String }],
  whatsIncluded: [{ type: String }],
  whatsNotIncluded: [{ type: String }],
  tags: [{ type: String }],
  
  // Enhanced content - NOW INCLUDED IN SCHEMA
  itinerary: [ItineraryItemSchema],
  faq: { type: [FAQSchema], default: [] },
  bookingOptions: [BookingOptionSchema],
  addOns: [AddOnSchema],
  
  // Practical information - NOW INCLUDED IN SCHEMA
  whatToBring: [{ type: String }],
  whatToWear: [{ type: String }],
  physicalRequirements: { type: String },
  accessibilityInfo: [{ type: String }],
  groupSize: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 10 }
  },
  transportationDetails: { type: String },
  mealInfo: { type: String },
  weatherPolicy: { type: String },
  photoPolicy: { type: String },
  tipPolicy: { type: String },
  healthSafety: [{ type: String }],
  culturalInfo: [{ type: String }],
  seasonalVariations: { type: String },
  localCustoms: [{ type: String }],
  meetingPoint: { type: String },
  languages: [{ type: String }],
  ageRestriction: { type: String },
  cancellationPolicy: { type: String },
  operatedBy: { type: String },
  
  // Status
  isFeatured: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  
  // Meta
  rating: { type: Number, default: 4.5 },
  bookings: { type: Number, default: 0 },
  
  // Relationships
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  availability: { type: AvailabilitySchema, required: true, default: () => ({}) },
}, { timestamps: true });

const Tour: Model<ITour> = mongoose.models.Tour || mongoose.model<ITour>('Tour', TourSchema);

export default Tour;