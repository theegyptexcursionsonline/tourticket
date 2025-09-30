// lib/models/Category.ts
import mongoose, { Document, Schema, models } from 'mongoose';

export interface ICategory extends Document {
  // Basic Info
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  
  // Media
  heroImage?: string;
  images?: string[];
  
  // Content
  highlights?: string[];
  features?: string[];
  
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  
  // Display Settings
  color?: string;
  icon?: string;
  order?: number;
  
  // Status
  isPublished?: boolean;
  featured?: boolean;
  
  // Stats
  tourCount?: number;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

const CategorySchema: Schema<ICategory> = new Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Category name is required'],
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
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  longDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Long description cannot exceed 2000 characters'],
  },
  
  // Media
  heroImage: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(v);
      },
      message: 'Hero image must be a valid URL with image extension'
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
  
  // Content
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
  features: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.every(item => item.trim().length > 0 && item.length <= 300);
      },
      message: 'Each feature must be non-empty and not exceed 300 characters'
    }
  },
  
  // SEO
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
  keywords: [{
    type: String,
    trim: true,
    maxlength: [50, 'Each keyword cannot exceed 50 characters'],
  }],
  
  // Display Settings
  color: {
    type: String,
    default: '#3B82F6',
    validate: {
      validator: function(v: string) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  icon: {
    type: String,
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  
  // Status
  isPublished: {
    type: Boolean,
    default: true,
    index: true,
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  // Stats
  tourCount: {
    type: Number,
    default: 0,
    min: [0, 'Tour count cannot be negative'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
CategorySchema.index({ name: 'text', description: 'text' });
CategorySchema.index({ featured: 1, isPublished: 1 });
CategorySchema.index({ order: 1 });

// Pre-save middleware
CategorySchema.pre('save', function(next) {
  // Auto-generate slug from name if not provided
  if (this.isModified('name') && !this.isModified('slug')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  // Auto-generate meta title from name if not provided
  if (!this.metaTitle && this.name) {
    this.metaTitle = this.name.length > 60 ? this.name.substring(0, 57) + '...' : this.name;
  }
  
  // Auto-generate meta description from description if not provided
  if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.length > 160 ? this.description.substring(0, 157) + '...' : this.description;
  }
  
  next();
});

export default models.Category || mongoose.model<ICategory>('Category', CategorySchema);