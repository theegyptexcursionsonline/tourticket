// lib/models/Category.ts
import mongoose, { Document, Schema, models } from 'mongoose';
import { URL_TYPES, UrlType } from '@/lib/content/contentUrl';
import type { ImageMetadata } from '@/lib/content/imageMetadata';
import { ImageMetadataSchema } from '@/lib/models/schemas/ImageMetadataSchema';
import { ParentPageSchema, breadcrumbLabelField } from '@/lib/models/contentNavigationSchema';
import { PAGE_TEMPLATES, type PageTemplate } from '@/lib/content/pageTemplate';

export interface ICategory extends Document {
  tenantId?: string;
  archivedAt?: Date | null;
  archivedBy?: string;
  // Basic Info
  name: string;
  slug: string;
  pageTemplate?: PageTemplate;
  urlType?: UrlType;
  breadcrumbLabel?: string;
  parentPage?: { id?: string; slug: string; label: string; kind: 'destination' | 'attraction' | 'category' | 'category-2' | 'landing'; href?: string } | null;
  cityDestination?: mongoose.Types.ObjectId;
  description?: string;
  longDescription?: string;
  
  // Media
  heroImage?: string;
  images?: string[];
  imageMetadata?: ImageMetadata[];
  
  // Content
  highlights?: string[];
  features?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  travelTips?: Array<{ title: string; content: string }>;
  popularDestinationIds?: mongoose.Types.ObjectId[];
  linkedPageIds?: mongoose.Types.ObjectId[];
  linkedCategoryIds?: mongoose.Types.ObjectId[];
  linkedPagesTitle?: string;
  linkedPagesSubtitle?: string;
  
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

  // Localized overrides by locale code (e.g. en, ar, de)
  translations?: Record<
    string,
    {
      name?: string;
      description?: string;
      longDescription?: string;
      highlights?: string[];
      features?: string[];
      linkedPagesTitle?: string;
      linkedPagesSubtitle?: string;
      metaTitle?: string;
      metaDescription?: string;
      faqs?: Array<{ question?: string; answer?: string }>;
      travelTips?: Array<{ title?: string; content?: string }>;
      imageMetadata?: Array<{ url?: string; alt?: string; title?: string }>;
    }
  >;
}

const CategoryTranslationSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    longDescription: { type: String, trim: true, maxlength: 2000 },
    highlights: [{ type: String, trim: true, maxlength: 200 }],
    features: [{ type: String, trim: true, maxlength: 300 }],
    linkedPagesTitle: { type: String, trim: true, maxlength: 200 },
    linkedPagesSubtitle: { type: String, trim: true, maxlength: 500 },
    metaTitle: { type: String, trim: true, maxlength: 60 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    faqs: [{
      question: { type: String, trim: true, maxlength: 300 },
      answer: { type: String, trim: true, maxlength: 2000 },
    }],
    travelTips: [{
      title: { type: String, trim: true, maxlength: 200 },
      content: { type: String, trim: true, maxlength: 1000 },
    }],
    imageMetadata: [{
      url: { type: String, trim: true, maxlength: 2000 },
      alt: { type: String, trim: true, maxlength: 300 },
      title: { type: String, trim: true, maxlength: 300 },
    }],
  },
  { _id: false }
);

const FaqSchema = new Schema({
  question: { type: String, required: true, trim: true, maxlength: 300 },
  answer: { type: String, required: true, trim: true, maxlength: 2000 },
}, { _id: false });

const TravelTipSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 1000 },
}, { _id: false });

const CategorySchema: Schema<ICategory> = new Schema({
  // Categories share one collection across the main and network portals.
  // Missing/empty values are legacy main-EEO records; new main records use
  // `default`, while network records carry their brand tenant id.
  tenantId: { type: String, trim: true, index: true },
  // Basic Info
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    index: true,
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    index: true,
  },
  // Admin-chosen public URL shape (see lib/content/contentUrl.ts).
  urlType: {
    type: String,
    enum: URL_TYPES,
    default: 'default',
  },
  pageTemplate: {
    type: String,
    enum: PAGE_TEMPLATES,
    default: 'classic',
  },
  breadcrumbLabel: breadcrumbLabelField,
  parentPage: { type: ParentPageSchema, default: undefined },
  // Owning city for the `city` urlType (/{city}/{slug}); ignored otherwise.
  cityDestination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    required: false,
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
  translations: {
    type: Map,
    of: CategoryTranslationSchema,
  },
  
  // Media
  heroImage: {
    type: String,
    trim: true,
  },
  images: [{
    type: String,
    trim: true,
  }],
  imageMetadata: {
    type: [ImageMetadataSchema],
    default: [],
  },
  
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
  faqs: {
    type: [FaqSchema],
    default: [],
  },
  travelTips: {
    type: [TravelTipSchema],
    default: [],
  },
  popularDestinationIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
  }],
  linkedPageIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttractionPage',
  }],
  linkedCategoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  linkedPagesTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Other page listings title cannot exceed 200 characters'],
    default: 'Explore more',
  },
  linkedPagesSubtitle: {
    type: String,
    trim: true,
    maxlength: [500, 'Other page listings subtitle cannot exceed 500 characters'],
    default: 'Hand-picked guides and collections related to this page',
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
  // Archived is derived from this timestamp rather than a status enum, so
  // existing isPublished queries keep working and nothing needs migrating.
  archivedAt: { type: Date, index: true },
  archivedBy: { type: String, trim: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
CategorySchema.index({ name: 'text', description: 'text' });
CategorySchema.index({ featured: 1, isPublished: 1 });
CategorySchema.index({ order: 1 });
CategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
CategorySchema.index({ tenantId: 1, slug: 1 }, { unique: true });

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

// Post-save hook to sync to Algolia
CategorySchema.post('save', async function(doc) {
  try {
    if (doc.isPublished) {
      const { syncCategoryToAlgolia } = await import('../algolia');
      await syncCategoryToAlgolia(doc);
      console.log(`Auto-synced category ${doc._id} to Algolia`);
    }
  } catch (error) {
    console.error('Error auto-syncing category to Algolia:', error);
  }
});

// Post-delete hooks to remove from Algolia
CategorySchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc) {
      const { deleteCategoryFromAlgolia } = await import('../algolia');
      await deleteCategoryFromAlgolia(doc._id.toString());
      console.log(`Auto-deleted category ${doc._id} from Algolia`);
    }
  } catch (error) {
    console.error('Error auto-deleting category from Algolia:', error);
  }
});

CategorySchema.post('deleteOne', async function(doc) {
  try {
    if (doc) {
      const { deleteCategoryFromAlgolia } = await import('../algolia');
      await deleteCategoryFromAlgolia(doc._id.toString());
      console.log(`Auto-deleted category ${doc._id} from Algolia`);
    }
  } catch (error) {
    console.error('Error auto-deleting category from Algolia:', error);
  }
});

export default models.Category || mongoose.model<ICategory>('Category', CategorySchema);
