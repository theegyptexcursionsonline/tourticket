// lib/models/Tour.ts
import mongoose, { Document, Schema, Model } from 'mongoose';
import './Review';

export interface IItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
  includes?: string[];
  icon?: string;
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
  originalPrice?: number;
  description?: string;
  duration?: string;
  languages?: string[];
  highlights?: string[];
  groupSize?: string;
  difficulty?: string;
  badge?: string;
  discount?: number;
  isRecommended?: boolean;
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
  location?: string; // Added for better search

  // Media
  image: string;
  images?: string[];

  // Lists and highlights
  includes?: string[];
  highlights?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  tags?: string[];

  // Enhanced content
  itinerary?: IItineraryItem[];
  faq?: IFAQ[];
  bookingOptions?: IBookingOption[];
  addOns?: IAddOn[];

  // Practical information
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
  
  // Virtual fields
  reviewDetails?: any[];
}

const ItineraryItemSchema = new Schema<IItineraryItem>({
  time: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String },
  location: { type: String },
  includes: [{ type: String }],
  icon: { type: String, default: 'location' },
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
    validate: {
      validator: function(days: number[]) {
        return days.every(day => day >= 0 && day <= 6);
      },
      message: 'Available days must be between 0-6 (Sunday-Saturday)'
    }
  },
  startDate: Date,
  endDate: Date,
  specificDates: [Date],
  slots: {
    type: [AvailabilitySlotSchema],
    required: true,
    default: [{ time: '10:00', capacity: 10 }],
    validate: {
      validator: function(slots: IAvailabilitySlot[]) {
        return slots.length > 0;
      },
      message: 'At least one time slot is required'
    }
  },
  blockedDates: [Date],
});

const FAQSchema = new Schema<IFAQ>({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
}, { _id: false });

const BookingOptionSchema = new Schema<IBookingOption>({
  type: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  description: { type: String, trim: true },
  duration: { type: String, trim: true },
  languages: [{ type: String, trim: true }],
  highlights: [{ type: String, trim: true }],
  groupSize: { type: String, trim: true },
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Moderate', 'Challenging', 'Difficult'],
    trim: true 
  },
  badge: { type: String, trim: true },
  discount: { type: Number, min: 0, max: 100 },
  isRecommended: { type: Boolean, default: false },
}, { _id: false });

const AddOnSchema = new Schema<IAddOn>({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

// COMPLETE Tour Schema with all fields
const TourSchema: Schema<ITour> = new Schema({
  // Basic fields
  title: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  destination: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Destination', 
    required: true,
    index: true
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true,
    index: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  longDescription: { 
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true,
    index: true // For better search performance
  },
  price: { 
    type: Number,
    min: 0
  },
  originalPrice: { 
    type: Number,
    min: 0
  },
  discountPrice: { 
    type: Number, 
    required: true,
    min: 0,
    index: true // For price-based filtering
  },
  duration: { 
    type: String, 
    required: true,
    trim: true
  },
  difficulty: { 
    type: String, 
    default: 'Easy',
    enum: ['Easy', 'Moderate', 'Challenging', 'Difficult']
  },
  maxGroupSize: { 
    type: Number, 
    default: 10,
    min: 1,
    max: 100
  },

  // Media
  image: { 
    type: String, 
    required: true,
    trim: true
  },
  images: [{ 
    type: String,
    trim: true
  }],

  // Lists
  includes: [{ 
    type: String,
    trim: true
  }],
  highlights: [{ 
    type: String,
    trim: true
  }],
  whatsIncluded: [{ 
    type: String,
    trim: true
  }],
  whatsNotIncluded: [{ 
    type: String,
    trim: true
  }],
  tags: [{ 
    type: String,
    trim: true,
    lowercase: true
  }],

  // Enhanced content
  itinerary: [ItineraryItemSchema],
  faq: { 
    type: [FAQSchema], 
    default: [] 
  },
  bookingOptions: [BookingOptionSchema],
  addOns: [AddOnSchema],

  // Practical information
  whatToBring: [{ 
    type: String,
    trim: true
  }],
  whatToWear: [{ 
    type: String,
    trim: true
  }],
  physicalRequirements: { 
    type: String,
    trim: true
  },
  accessibilityInfo: [{ 
    type: String,
    trim: true
  }],
  groupSize: {
    min: { type: Number, default: 1, min: 1 },
    max: { type: Number, default: 10, min: 1 }
  },
  transportationDetails: { 
    type: String,
    trim: true
  },
  mealInfo: { 
    type: String,
    trim: true
  },
  weatherPolicy: { 
    type: String,
    trim: true
  },
  photoPolicy: { 
    type: String,
    trim: true
  },
  tipPolicy: { 
    type: String,
    trim: true
  },
  healthSafety: [{ 
    type: String,
    trim: true
  }],
  culturalInfo: [{ 
    type: String,
    trim: true
  }],
  seasonalVariations: { 
    type: String,
    trim: true
  },
  localCustoms: [{ 
    type: String,
    trim: true
  }],
  meetingPoint: { 
    type: String,
    trim: true
  },
  languages: [{ 
    type: String,
    trim: true
  }],
  ageRestriction: { 
    type: String,
    trim: true
  },
  cancellationPolicy: { 
    type: String,
    trim: true
  },
  operatedBy: { 
    type: String,
    trim: true
  },

  // Status
  isFeatured: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isPublished: { 
    type: Boolean, 
    default: true,
    index: true
  },

  // Meta
  rating: { 
    type: Number, 
    default: 4.5,
    min: 0,
    max: 5,
    index: true // For rating-based sorting
  },
  bookings: { 
    type: Number, 
    default: 0,
    min: 0,
    index: true // For popularity-based sorting
  },

  // Relationships
  reviews: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Review' 
  }],
  availability: { 
    type: AvailabilitySchema, 
    required: true, 
    default: () => ({}) 
  },
}, { 
  timestamps: true,
  // Enable text search on schema level
  collection: 'tours'
});

// Add virtual property for review details
TourSchema.virtual('reviewDetails', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'tourId',
  justOne: false
});

// Ensure virtuals are included in JSON output
TourSchema.set('toJSON', { virtuals: true });
TourSchema.set('toObject', { virtuals: true });

// Pre-save middleware for slug generation
TourSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Pre-save middleware for location extraction
TourSchema.pre('save', function(next) {
  if (!this.location && this.destination) {
    // You might want to populate destination and extract location here
    // For now, we'll just ensure location is set if missing
  }
  next();
});

// Validation for price consistency
TourSchema.pre('save', function(next) {
  if (this.originalPrice && this.discountPrice && this.discountPrice > this.originalPrice) {
    next(new Error('Discount price cannot be higher than original price'));
  }
  next();
});

// Text search indexes for flexible search
TourSchema.index({
  title: 'text',
  description: 'text',
  location: 'text',
  tags: 'text',
  highlights: 'text',
  longDescription: 'text'
}, {
  weights: {
    title: 10,
    location: 8,
    tags: 6,
    highlights: 5,
    description: 3,
    longDescription: 1
  },
  name: 'tour_text_index'
});

// Additional performance indexes
TourSchema.index({ category: 1, isPublished: 1 });
TourSchema.index({ destination: 1, isPublished: 1 });
TourSchema.index({ rating: -1, bookings: -1 });
TourSchema.index({ discountPrice: 1, isPublished: 1 });
TourSchema.index({ isFeatured: 1, isPublished: 1 });
TourSchema.index({ createdAt: -1 });
TourSchema.index({ slug: 1 }, { unique: true });

// Compound indexes for common query patterns
TourSchema.index({ 
  category: 1, 
  destination: 1, 
  isPublished: 1 
});

TourSchema.index({ 
  discountPrice: 1, 
  rating: -1, 
  isPublished: 1 
});

TourSchema.index({
  isFeatured: 1,
  rating: -1,
  bookings: -1,
  isPublished: 1
});

// Static methods for common operations
TourSchema.statics.findPublished = function() {
  return this.find({ isPublished: true });
};

TourSchema.statics.findFeatured = function() {
  return this.find({ isFeatured: true, isPublished: true });
};

TourSchema.statics.findByCategory = function(categoryId: string) {
  return this.find({ 
    category: categoryId, 
    isPublished: true 
  });
};

TourSchema.statics.findByDestination = function(destinationId: string) {
  return this.find({ 
    destination: destinationId, 
    isPublished: true 
  });
};

TourSchema.statics.searchTours = function(query: string) {
  return this.find({
    $text: { $search: query },
    isPublished: true
  }, {
    score: { $meta: "textScore" }
  }).sort({
    score: { $meta: "textScore" }
  });
};

// Instance methods
TourSchema.methods.updateRating = async function() {
  // This would calculate average rating from reviews
  // Implementation depends on your Review model
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { tourId: this._id } },
    { $group: { 
      _id: null, 
      avgRating: { $avg: '$rating' },
      totalReviews: { $sum: 1 }
    }}
  ]);
  
  if (stats.length > 0) {
    this.rating = Math.round(stats[0].avgRating * 10) / 10;
    await this.save();
  }
};

TourSchema.methods.incrementBookings = async function() {
  this.bookings = (this.bookings || 0) + 1;
  await this.save();
};

// Create and export the model
const Tour: Model<ITour> = mongoose.models.Tour || mongoose.model<ITour>('Tour', TourSchema);

export default Tour;

// Export additional types for use in other files
export type { ITour, IItineraryItem, IAvailability, IFAQ, IBookingOption, IAddOn };