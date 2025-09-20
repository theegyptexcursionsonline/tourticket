import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBlog extends Document {
  // Basic Info
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  
  // Media
  featuredImage: string;
  images?: string[];
  
  // Categorization
  category: string;
  tags: string[];
  
  // Author Info
  author: string;
  authorAvatar?: string;
  authorBio?: string;
  
  // SEO & Meta
  metaTitle?: string;
  metaDescription?: string;
  readTime: number; // in minutes
  
  // Status & Publishing
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: Date;
  scheduledFor?: Date;
  
  // Features
  featured: boolean;
  allowComments: boolean;
  
  // Analytics
  views: number;
  likes: number;
  
  // Related Content
  relatedDestinations?: mongoose.Schema.Types.ObjectId[];
  relatedTours?: mongoose.Schema.Types.ObjectId[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema: Schema<IBlog> = new Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
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
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    trim: true,
    minlength: [10, 'Excerpt must be at least 10 characters'],
    maxlength: [300, 'Excerpt cannot exceed 300 characters'],
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    minlength: [100, 'Content must be at least 100 characters'],
  },
  
  // Media
  featuredImage: {
    type: String,
    required: [true, 'Featured image is required'],
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(v);
      },
      message: 'Featured image must be a valid URL with image extension'
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
  
  // Categorization
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: [
      'travel-tips',
      'destination-guides',
      'food-culture',
      'adventure',
      'budget-travel',
      'luxury-travel',
      'solo-travel',
      'family-travel',
      'photography',
      'local-insights',
      'seasonal-travel',
      'transportation',
      'accommodation',
      'news-updates'
    ],
    index: true,
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr: string[]) {
        return arr.length <= 10 && arr.every(tag => tag.trim().length > 0 && tag.length <= 50);
      },
      message: 'Maximum 10 tags allowed, each must be non-empty and not exceed 50 characters'
    }
  },
  
  // Author Info
  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
    minlength: [2, 'Author name must be at least 2 characters'],
    maxlength: [100, 'Author name cannot exceed 100 characters'],
    index: true,
  },
  authorAvatar: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(v);
      },
      message: 'Author avatar must be a valid URL with image extension'
    }
  },
  authorBio: {
    type: String,
    trim: true,
    maxlength: [500, 'Author bio cannot exceed 500 characters'],
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
  readTime: {
    type: Number,
    required: true,
    min: [1, 'Read time must be at least 1 minute'],
    max: [60, 'Read time cannot exceed 60 minutes'],
    default: function() {
      // Estimate read time based on content (average 200 words per minute)
      const wordCount = this.content ? this.content.split(/\s+/).length : 0;
      return Math.max(1, Math.ceil(wordCount / 200));
    }
  },
  
  // Status & Publishing
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled'],
    default: 'draft',
    index: true,
  },
  publishedAt: {
    type: Date,
    index: true,
  },
  scheduledFor: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v > new Date();
      },
      message: 'Scheduled date must be in the future'
    }
  },
  
  // Features
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  allowComments: {
    type: Boolean,
    default: true,
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative'],
    index: true,
  },
  likes: {
    type: Number,
    default: 0,
    min: [0, 'Likes cannot be negative'],
  },
  
  // Related Content
  relatedDestinations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
  }],
  relatedTours: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
BlogSchema.index({ title: 'text', excerpt: 'text', content: 'text' });
BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ category: 1, status: 1 });
BlogSchema.index({ featured: 1, status: 1, publishedAt: -1 });
BlogSchema.index({ author: 1, status: 1 });
BlogSchema.index({ tags: 1, status: 1 });
BlogSchema.index({ views: -1 });

// Virtual for formatted publish date
BlogSchema.virtual('publishedDate').get(function() {
  return this.publishedAt ? this.publishedAt.toLocaleDateString() : null;
});

// Virtual for reading time text
BlogSchema.virtual('readTimeText').get(function() {
  return `${this.readTime} min read`;
});

// Virtual for category display name
BlogSchema.virtual('categoryDisplay').get(function() {
  return this.category.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
});

// Pre-save middleware
BlogSchema.pre('save', function(next) {
  // Auto-generate slug from title if not provided
  if (this.isModified('title') && !this.isModified('slug')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  // Auto-set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Auto-generate meta title from title if not provided
  if (!this.metaTitle && this.title) {
    this.metaTitle = this.title.length > 60 ? this.title.substring(0, 57) + '...' : this.title;
  }
  
  // Auto-generate meta description from excerpt if not provided
  if (!this.metaDescription && this.excerpt) {
    this.metaDescription = this.excerpt.length > 160 ? this.excerpt.substring(0, 157) + '...' : this.excerpt;
  }
  
  next();
});

// Static methods
BlogSchema.statics.getPublished = function() {
  return this.find({ status: 'published' }).sort({ publishedAt: -1 });
};

BlogSchema.statics.getFeatured = function() {
  return this.find({ status: 'published', featured: true }).sort({ publishedAt: -1 });
};

BlogSchema.statics.getByCategory = function(category: string) {
  return this.find({ status: 'published', category }).sort({ publishedAt: -1 });
};

const Blog: Model<IBlog> = mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);

export default Blog;