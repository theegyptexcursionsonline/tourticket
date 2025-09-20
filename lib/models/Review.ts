// lib/models/Review.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReview extends Document {
  tourId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  userName: string;
  userEmail: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  verified: boolean;
  helpful: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema<IReview> = new Schema({
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [{
    type: String,
    trim: true
  }],
  verified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate reviews
ReviewSchema.index({ tourId: 1, userId: 1 }, { unique: true });

// Index for sorting by date
ReviewSchema.index({ createdAt: -1 });

// Index for verified reviews
ReviewSchema.index({ tourId: 1, verified: 1 });

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;