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
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits for shorter ref
  const random = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 random chars
  return `${prefix}-${timestamp}-${random}`;
}

const BookingSchema: Schema<IBooking> = new Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    index: true,
    // Remove the default function - we'll handle this in pre-save
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

// Enhanced pre-save hook to generate unique booking reference
BookingSchema.pre('save', async function(next) {
  // Only generate for new documents without a booking reference
  if (this.isNew && !this.bookingReference) {
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10; // Increased attempts
    let generatedReference = '';

    while (!isUnique && attempts < maxAttempts) {
      generatedReference = generateBookingReference();
      attempts++;
      
      try {
        // Use the model constructor to avoid circular reference issues
        const BookingModel = this.constructor as Model<IBooking>;
        const existingBooking = await BookingModel.findOne({ 
          bookingReference: generatedReference 
        });
        
        if (!existingBooking) {
          isUnique = true;
          this.bookingReference = generatedReference;
        } else {
          // Add a small delay to avoid rapid collisions
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        }
      } catch (error) {
        console.error('Error checking booking reference uniqueness:', error);
        // Continue with the loop to try again
      }
    }

    if (!isUnique || !this.bookingReference) {
      // Fallback: use timestamp + ObjectId to ensure uniqueness
      const fallbackRef = `EEO-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`;
      this.bookingReference = fallbackRef;
      console.warn('Used fallback booking reference:', fallbackRef);
    }
  }
  
  next();
});

// Add a static method to generate booking reference manually if needed
BookingSchema.statics.generateUniqueReference = async function(): Promise<string> {
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    const reference = generateBookingReference();
    attempts++;
    
    try {
      const existing = await this.findOne({ bookingReference: reference });
      if (!existing) {
        return reference;
      }
    } catch (error) {
      console.error('Error generating unique reference:', error);
    }
  }
  
  // Fallback
  return `EEO-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-6).toUpperCase()}`;
};

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
BookingSchema.index({ bookingReference: 1 }, { unique: true });

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;