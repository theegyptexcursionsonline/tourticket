import mongoose, { Document, Schema, models } from 'mongoose';

export interface IReview extends Document {
  tour: mongoose.Schema.Types.ObjectId;  // Changed from tourId
  user: mongoose.Schema.Types.ObjectId;  // Changed from userId
  rating: number;
  comment: string;
  isApproved: boolean;  // Added approval system
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema({
  tour: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tour', 
    required: true,
    index: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    required: true, 
    maxlength: 1000,
    trim: true 
  },
  isApproved: { 
    type: Boolean, 
    default: false,
    index: true 
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to prevent duplicate reviews from same user for same tour
ReviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Index for finding approved reviews
ReviewSchema.index({ tour: 1, isApproved: 1, createdAt: -1 });

export default models.Review || mongoose.model<IReview>('Review', ReviewSchema);