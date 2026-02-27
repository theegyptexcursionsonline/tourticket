// lib/models/SpecialOffer.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITourOptionSelection {
  tourId: mongoose.Types.ObjectId;
  tourTitle?: string;
  selectedOptions?: string[];
  allOptions?: boolean;
}

export type OfferType = 'percentage' | 'fixed' | 'bundle' | 'early_bird' | 'last_minute' | 'group' | 'promo_code';

export interface ISpecialOffer extends Document {
  name: string;
  description?: string;
  type: OfferType;
  discountValue: number;
  code?: string;
  minDaysInAdvance?: number;
  maxDaysBeforeTour?: number;
  minBookingValue?: number;
  maxDiscount?: number;
  minGroupSize?: number;
  startDate: Date;
  endDate: Date;
  travelStartDate?: Date;
  travelEndDate?: Date;
  bookingWindow?: { daysBeforeTravel?: number; daysAfterRelease?: number };
  applicableTours: mongoose.Types.ObjectId[];
  tourOptionSelections?: ITourOptionSelection[];
  applicableCategories?: mongoose.Types.ObjectId[];
  excludedTours?: mongoose.Types.ObjectId[];
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  isActive: boolean;
  isFeatured: boolean;
  featuredBadgeText?: string;
  priority: number;
  terms?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TourOptionSelectionSchema = new Schema({
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
  selectedOptions: [{ type: String, trim: true }],
  allOptions: { type: Boolean, default: true },
}, { _id: false });

const SpecialOfferSchema: Schema<ISpecialOffer> = new Schema({
  name: { type: String, required: [true, 'Offer name is required'], trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'bundle', 'early_bird', 'last_minute', 'group', 'promo_code'],
    required: true,
    default: 'percentage',
  },
  discountValue: { type: Number, required: true, min: 0 },
  code: { type: String, trim: true, uppercase: true, sparse: true },
  minDaysInAdvance: { type: Number, min: 1, default: 7 },
  maxDaysBeforeTour: { type: Number, min: 0, default: 2 },
  minBookingValue: { type: Number, min: 0 },
  maxDiscount: { type: Number, min: 0 },
  minGroupSize: { type: Number, min: 2 },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  travelStartDate: { type: Date },
  travelEndDate: { type: Date },
  bookingWindow: { daysBeforeTravel: Number, daysAfterRelease: Number },
  applicableTours: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tour' }],
  tourOptionSelections: [TourOptionSelectionSchema],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  excludedTours: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tour' }],
  usageLimit: { type: Number, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  perUserLimit: { type: Number, min: 1, default: 1 },
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false },
  featuredBadgeText: { type: String, trim: true, default: 'Special Offer' },
  priority: { type: Number, default: 0 },
  terms: [{ type: String, trim: true }],
}, { timestamps: true });

SpecialOfferSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
SpecialOfferSchema.index({ code: 1 }, { unique: true, sparse: true });

SpecialOfferSchema.virtual('isCurrentlyValid').get(function (this: ISpecialOffer) {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate && (!this.usageLimit || this.usedCount < this.usageLimit);
});

const SpecialOffer: Model<ISpecialOffer> =
  mongoose.models.SpecialOffer || mongoose.model<ISpecialOffer>('SpecialOffer', SpecialOfferSchema);

export default SpecialOffer;
