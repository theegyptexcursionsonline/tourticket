// lib/models/Discount.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IDiscount extends Document {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  expiresAt?: Date;
  usageLimit?: number;
  timesUsed: number;
}

const DiscountSchema: Schema<IDiscount> = new Schema({
  code: {
    type: String,
    required: [true, 'Discount code is required.'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required.'],
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required.'],
    min: [0, 'Discount value cannot be negative.'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
  },
  usageLimit: {
    type: Number,
    min: [0, 'Usage limit cannot be negative.'],
  },
  timesUsed: {
    type: Number,
    default: 0,
    min: [0, 'Times used cannot be negative.'],
  },
}, { timestamps: true });

const Discount: Model<IDiscount> = mongoose.models.Discount || mongoose.model<IDiscount>('Discount', DiscountSchema);

export default Discount;