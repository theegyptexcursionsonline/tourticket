// lib/models/Booking.ts (Updated)
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  // Add this new field
  bookingReference: string;
  
  // Existing fields
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
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  selectedAddOns?: { [key: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

// Function to generate unique booking reference
function generateBookingReference(): string {
  const prefix = 'EEO';
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
  return `${prefix}-${timestamp}-${random}`;
}

const BookingSchema: Schema<IBooking> = new Schema({
  // Add the new booking reference field
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    default: generateBookingReference,
    index: true
  },
  
  // Existing fields (keep all as they are)
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
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Ensure booking reference is unique (pre-save hook)
BookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.bookingReference) {
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
      this.bookingReference = generateBookingReference();
      
      try {
        const existingBooking = await mongoose.model('Booking').findOne({ 
          bookingReference: this.bookingReference 
        });
        
        if (!existingBooking) {
          isUnique = true;
        }
        attempts++;
      } catch (error) {
        attempts++;
      }
    }

    if (!isUnique) {
      return next(new Error('Could not generate unique booking reference'));
    }
  }
  next();
});

// Virtual for guest breakdown text (keep existing)
BookingSchema.virtual('guestBreakdown').get(function() {
  const parts = [];
  if (this.adultGuests > 0) parts.push(`${this.adultGuests} adult${this.adultGuests > 1 ? 's' : ''}`);
  if (this.childGuests > 0) parts.push(`${this.childGuests} child${this.childGuests > 1 ? 'ren' : ''}`);
  if (this.infantGuests > 0) parts.push(`${this.infantGuests} infant${this.infantGuests > 1 ? 's' : ''}`);
  return parts.join(', ');
});

// Indexes for efficient queries (keep existing)
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ tour: 1, date: 1 });
BookingSchema.index({ status: 1 });

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;