import mongoose, { Document, Schema, models } from 'mongoose';

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
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(v);
      },
      message: 'Image must be a valid URL with image extension'
    }
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(v);
      },
      message: 'Each image must be a valid URL with image extension'
    }
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
    validate: {
      validator: function(v: string) {
        // Basic timezone validation
        return /^[A-Z]{3,4}([+-]\d{1,2})?$/.test(v) || /^[A-Za-z]+\/[A-Za-z_]+$/.test(v);
      },
      message: 'Timezone must be a valid timezone (e.g., CET, America/New_York)'
    }
  },
  bestTimeToVisit: {
    type: String,
    required: [true, 'Best time to visit is required'],
    trim: true,
    maxlength: [200, 'Best time to visit cannot exceed 200 characters'],
  },
  
  // Content Arrays
  highlights: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(item => item.trim().length > 0 && item.length <= 200);
      },
      message: 'Each highlight must be non-empty and not exceed 200 characters'
    }
  },
  thingsToDo: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(item => item.trim().length > 0 && item.length <= 300);
      },
      message: 'Each thing to do must be non-empty and not exceed 300 characters'
    }
  },
  localCustoms: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(item => item.trim().length > 0 && item.length <= 500);
      },
      message: 'Each custom must be non-empty and not exceed 500 characters'
    }
  },
  
  // Travel Information
  visaRequirements: {
    type: String,
    trim: true,
    maxlength: [1000, 'Visa requirements cannot exceed 1000 characters'],
  },
  languagesSpoken: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(lang => lang.trim().length > 0 && lang.length <= 50);
      },
      message: 'Each language must be non-empty and not exceed 50 characters'
    }
  },
  emergencyNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^[\d\s\-\+\(\)]+$/.test(v);
      },
      message: 'Emergency number must contain only numbers, spaces, and phone characters'
    }
  },
  
  // Climate & Weather
  averageTemperature: {
    type: AverageTemperatureSchema,
  },
  climate: {
    type: String,
    trim: true,
    maxlength: [500, 'Climate description cannot exceed 500 characters'],
  },
  weatherWarnings: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(warning => warning.trim().length > 0 && warning.length <= 300);
      },
      message: 'Each weather warning must be non-empty and not exceed 300 characters'
    }
  },
  
  // Status & Meta
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  isPublished: {
    type: Boolean,
    default: true,
    index: true,
  },
  tourCount: {
    type: Number,
    default: 0,
    min: [0, 'Tour count cannot be negative'],
    index: true,
  },
  
  // SEO & Meta
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters'],
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters'],
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(tag => tag.trim().length > 0 && tag.length <= 50);
      },
      message: 'Each tag must be non-empty and not exceed 50 characters'
    }
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
DestinationSchema.index({ name: 'text', description: 'text', country: 'text' });
DestinationSchema.index({ featured: 1, isPublished: 1 });
DestinationSchema.index({ country: 1, featured: 1 });
DestinationSchema.index({ tourCount: -1 });

// Virtual for full name with country
DestinationSchema.virtual('fullName').get(function() {
  return `${this.name}, ${this.country}`;
});

// Virtual for coordinate string
DestinationSchema.virtual('coordinateString').get(function() {
  return `${this.coordinates.lat}, ${this.coordinates.lng}`;
});

// Pre-save middleware to ensure slug is generated
DestinationSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

export default models.Destination || mongoose.model<IDestination>('Destination', DestinationSchema);