import mongoose, { Document, Schema, models } from 'mongoose';

export interface IReview extends Document {
  tourId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  date: Date;
  verified: boolean;
  helpful: number;
}

const ReviewSchema: Schema = new Schema({
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, maxlength: 100 },
  comment: { type: String, required: true, maxlength: 500 },
  date: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 }
}, { timestamps: true });

export default models.Review || mongoose.model<IReview>('Review', ReviewSchema);