import mongoose, { Document, Schema, models } from 'mongoose';

export interface ITour extends Document {
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  duration: string;
  rating: number;
  bookings?: number;
  originalPrice?: number;
  discountPrice: number;
  tags?: string[];
  image: string; // Main image URL from Cloudinary
  images?: string[]; // Gallery images URLs from Cloudinary
  highlights?: string[];
  includes?: string[];
  meetingPoint?: string;
  cancellationPolicy?: string;
  ageRestriction?: string;
  location?: {
    address: string;
  };
  destination: mongoose.Schema.Types.ObjectId;
  categories: mongoose.Schema.Types.ObjectId[];
  isFeatured?: boolean;
}

const TourSchema: Schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  longDescription: { type: String },
  duration: { type: String, required: true },
  rating: { type: Number, default: 0 },
  bookings: { type: Number, default: 0 },
  originalPrice: { type: Number },
  discountPrice: { type: Number, required: true },
  tags: [{ type: String }],
  image: { type: String, required: true },
  images: [{ type: String }],
  highlights: [{ type: String }],
  includes: [{ type: String }],
  meetingPoint: { type: String },
  cancellationPolicy: { type: String },
  ageRestriction: { type: String },
  location: {
    address: { type: String },
  },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

export default models.Tour || mongoose.model<ITour>('Tour', TourSchema);