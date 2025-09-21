// lib/models/Booking.ts (Fixed)
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  bookingReference: string;
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
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

const BookingSchema: Schema<IBooking> = new Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    index: true
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

// Pre-save hook to generate booking reference
BookingSchema.pre('save', async function(next) {
  if (this.isNew && !this.bookingReference) {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const newReference = generateBookingReference();
      
      try {
        // Check if this reference already exists
        const existingBooking = await this.constructor.findOne({ 
          bookingReference: newReference 
        }).lean();
        
        if (!existingBooking) {
          this.bookingReference = newReference;
          break;
        }
      } catch (error) {
        console.error('Error checking booking reference uniqueness:', error);
      }
      
      attempts++;
      
      // Add a small delay to prevent race conditions
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      }
    }

    if (!this.bookingReference) {
      const fallbackReference = `EEO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      this.bookingReference = fallbackReference;
    }
  }
  next();
});

// Virtual for guest breakdown text
BookingSchema.virtual('guestBreakdown').get(function() {
  const parts = [];
  if (this.adultGuests > 0) parts.push(`${this.adultGuests} adult${this.adultGuests > 1 ? 's' : ''}`);
  if (this.childGuests > 0) parts.push(`${this.childGuests} child${this.childGuests > 1 ? 'ren' : ''}`);
  if (this.infantGuests > 0) parts.push(`${this.infantGuests} infant${this.infantGuests > 1 ? 's' : ''}`);
  return parts.join(', ');
});

// Indexes for efficient queries
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ tour: 1, date: 1 });
BookingSchema.index({ status: 1 });

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;