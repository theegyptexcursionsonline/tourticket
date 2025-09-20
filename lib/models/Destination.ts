import mongoose, { Document, Schema, models } from 'mongoose';

// Interface defining the Destination document structure
export interface IDestination extends Document {
  // Basic Info
  name: string;
  slug: string;
  country: string;
  
  // Media
  image: string;
  images?: string[];
  
  // Descriptions
  description: string;
  longDescription?: string;
  
  // Location Data
  coordinates: {
    lat: number;
    lng: number;
  };
  
  // Practical Information
  currency: string;
  timezone: string;
  bestTimeToVisit: string;
  
  // Content Arrays
  highlights: string[];
  thingsToDo: string[];
  localCustoms?: string[];
  
  // Travel Information
  visaRequirements?: string;
  languagesSpoken?: string[];
  emergencyNumber?: string;
  
  // Climate & Weather
  averageTemperature?: {
    summer: string;
    winter: string;
  };
  climate?: string;
  weatherWarnings?: string[];
  
  // Status & Meta
  featured: boolean;
  isPublished: boolean;
  tourCount: number;
  
  // SEO & Meta
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Sub-schema for coordinates to ensure structure and validation
const CoordinatesSchema = new Schema({
  lat: {
    type: Number,
    required: [true, 'Latitude is required'],
    min: [-90, 'Latitude must be between -90 and 90'],
    max: [90, 'Latitude must be between -90 and 90'],
  },
  lng: {
    type: Number,
    required: [true, 'Longitude is required'],
    min: [-180, 'Longitude must be between -180 and 180'],
    max: [180, 'Longitude must be between -180 and 180'],
  }
}, { _id: false });

// Sub-schema for average temperature
const AverageTemperatureSchema = new Schema({
  summer: {
    type: String,
    trim: true,
  },
  winter: {
    type: String,
    trim: true,
  }
}, { _id: false });

// Main Destination Schema
const DestinationSchema: Schema<IDestination> = new Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Destination name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    index: true,
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    index: true,
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    minlength: [2, 'Country must be at least 2 characters'],
    maxlength: [100, 'Country cannot exceed 100 characters'],
    index: true,
  },
  
  // Media
  image: {
    type: String,
    required: [true, 'Main image is required'],
  },
  images: [{
    type: String,
  }],
  
  // Descriptions
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  longDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Long description cannot exceed 2000 characters'],
  },
  
  // Location Data
  coordinates: {
    type: CoordinatesSchema,
    required: [true, 'Coordinates are required'],
  },
  
  // Practical Information
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    trim: true,
    minlength: [3, 'Currency code must be 3 characters'],
    maxlength: [3, 'Currency code must be 3 characters'],
    match: [/^[A-Z]{3}$/, 'Currency must be a valid 3-letter code (e.g., USD, EUR)'],
  },
  timezone: {
    type: String,
    required: [true, 'Timezone is required'],
    trim: true,
  },
  bestTimeToVisit: {
    type: String,
    required: [true, 'Best time to visit is required'],
    trim: true,
    maxlength: [200, 'Best time to visit cannot exceed 200 characters'],
  },
  
  // Content Arrays
  highlights: { type: [String], default: [] },
  thingsToDo: { type: [String], default: [] },
  localCustoms: { type: [String], default: [] },
  
  // Travel Information
  visaRequirements: { type: String, trim: true, maxlength: 1000 },
  languagesSpoken: { type: [String], default: [] },
  emergencyNumber: { type: String, trim: true },
  
  // Climate & Weather
  averageTemperature: { type: AverageTemperatureSchema },
  climate: { type: String, trim: true, maxlength: 500 },
  weatherWarnings: { type: [String], default: [] },
  
  // Status & Meta
  featured: { type: Boolean, default: false, index: true },
  isPublished: { type: Boolean, default: true, index: true },
  tourCount: { type: Number, default: 0, min: 0, index: true },
  
  // SEO & Meta
  metaTitle: { type: String, trim: true, maxlength: 60 },
  metaDescription: { type: String, trim: true, maxlength: 160 },
  tags: { type: [String], default: [] },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// --- INDEXES FOR PERFORMANCE ---
DestinationSchema.index({ name: 'text', description: 'text', country: 'text' });
DestinationSchema.index({ featured: 1, isPublished: 1 });
DestinationSchema.index({ country: 1, featured: 1 });
DestinationSchema.index({ tourCount: -1 });

// --- VIRTUAL PROPERTIES ---

// Virtual for full name with country
DestinationSchema.virtual('fullName').get(function() {
  return `${this.name}, ${this.country}`;
});

// Virtual for a safe coordinate string (prevents server crashes)
DestinationSchema.virtual('coordinateString').get(function() {
  // Check if coordinates and its properties exist before creating the string
  if (this.coordinates && typeof this.coordinates.lat === 'number' && typeof this.coordinates.lng === 'number') {
    return `${this.coordinates.lat}, ${this.coordinates.lng}`;
  }
  // Return an empty string if data is missing to avoid errors
  return '';
});

// --- MIDDLEWARE ---

// Pre-save middleware to automatically generate a slug from the name
DestinationSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/&/g, 'and') // Replace '&' with 'and'
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove consecutive hyphens
      .trim();
  }
  next();
});

export default models.Destination || mongoose.model<IDestination>('Destination', DestinationSchema);