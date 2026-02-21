// lib/models/Booking.ts (Complete - Nothing Omitted)
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Document, Schema, Model } from 'mongoose';

// Edit history entry interface for tracking changes
export interface IBookingEditHistoryEntry {
  editedAt: Date;
  editedBy: string; // admin user id or email
  editedByName?: string; // admin user name for display
  field: string; // which field was changed
  previousValue: string;
  newValue: string;
  changeType: 'status_change' | 'detail_update' | 'refund';
}

// Booking status type - includes new refund statuses
export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled' | 'Refunded' | 'Partial_Refund';

// Array of valid statuses for validation
export const BOOKING_STATUSES: BookingStatus[] = ['Confirmed', 'Pending', 'Cancelled', 'Refunded', 'Partial_Refund'];

export interface IBooking extends Document {
  bookingReference: string;
  tour: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  date: Date;
  dateString?: string; // YYYY-MM-DD format - timezone-safe for display
  time: string;
  guests: number;
  totalPrice: number;
  currency: string; // Currency code (USD, EUR, etc.)
  status: BookingStatus;
  paymentId?: string;
  paymentMethod?: string;
  specialRequests?: string;
  emergencyContact?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    address: string;
    lat: number;
    lng: number;
    placeId?: string;
    name?: string; // Hotel name for better display
  };
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  selectedAddOns?: { [key: string]: number };
  selectedBookingOption?: {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  selectedAddOnDetails?: {
    [key: string]: {
      id: string;
      title: string;
      price: number;
      category?: string;
      perGuest?: boolean;
    };
  };
  // Edit history tracking
  editHistory?: IBookingEditHistoryEntry[];
  // Refund tracking
  refundAmount?: number;
  refundDate?: Date;
  refundReason?: string;
  // Discount tracking
  discountCode?: string;
  discountAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Edit history entry schema
const EditHistoryEntrySchema = new Schema({
  editedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  editedBy: {
    type: String,
    required: true,
  },
  editedByName: {
    type: String,
  },
  field: {
    type: String,
    required: true,
  },
  previousValue: {
    type: String,
    required: true,
  },
  newValue: {
    type: String,
    required: true,
  },
  changeType: {
    type: String,
    enum: ['status_change', 'detail_update', 'refund'],
    required: true,
  },
}, { _id: false });

const BookingSchema: Schema<IBooking> = new Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true,
  },
  
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true,
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid tour ID format'
    }
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid user ID format'
    }
  },
  
  date: {
    type: Date,
    required: true,
  },

  // Store original date string (YYYY-MM-DD) for timezone-safe display
  // This prevents timezone drift when displaying dates across different regions
  dateString: {
    type: String,
    match: /^\d{4}-\d{2}-\d{2}$/,
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
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    enum: ['USD', 'EUR', 'GBP', 'EGP', 'AED', 'CHF', 'CAD', 'AUD', 'SEK', 'DKK', 'NOK', 'JPY', 'KRW', 'CNY', 'INR', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'],
  },
  
  status: {
    type: String,
    enum: BOOKING_STATUSES,
    default: 'Confirmed',
  },
  
  paymentId: {
    type: String,
    index: { unique: true, sparse: true }, // Unique when present, allows null/undefined
  },
  
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'bank', 'cash', 'pay_later'],
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
  
  hotelPickupDetails: {
    type: String,
    maxlength: 300,
  },
  
  hotelPickupLocation: {
    address: String,
    lat: Number,
    lng: Number,
    placeId: String,
    name: String, // Hotel name for better display
  },
  
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
  
  selectedAddOns: {
    type: Map,
    of: Number,
    default: new Map(),
  },

  selectedBookingOption: {
    type: {
      id: String,
      title: String,
      price: Number,
      originalPrice: Number,
      duration: String,
      badge: String,
    },
    required: false,
  },

  selectedAddOnDetails: {
    type: Map,
    of: {
      id: String,
      title: String,
      price: Number,
      category: String,
      perGuest: Boolean,
    },
    default: new Map(),
  },

  // Edit history tracking
  editHistory: {
    type: [EditHistoryEntrySchema],
    default: [],
  },

  // Refund tracking
  refundAmount: {
    type: Number,
    min: 0,
  },
  refundDate: {
    type: Date,
  },
  refundReason: {
    type: String,
    maxlength: 500,
  },

  // Discount tracking
  discountCode: {
    type: String,
    maxlength: 50,
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for guest breakdown text
BookingSchema.virtual('guestBreakdown').get(function() {
  const parts = [];
  if (this.adultGuests && this.adultGuests > 0) parts.push(`${this.adultGuests} adult${this.adultGuests > 1 ? 's' : ''}`);
  if (this.childGuests && this.childGuests > 0) parts.push(`${this.childGuests} child${this.childGuests > 1 ? 'ren' : ''}`);
  if (this.infantGuests && this.infantGuests > 0) parts.push(`${this.infantGuests} infant${this.infantGuests > 1 ? 's' : ''}`);
  return parts.join(', ');
});

// Indexes for efficient queries
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ tour: 1, date: 1 });
BookingSchema.index({ status: 1 });
// Note: bookingReference and paymentId unique indexes are defined inline in schema

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;