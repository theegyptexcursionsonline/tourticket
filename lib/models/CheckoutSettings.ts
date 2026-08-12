import mongoose, { type Document, type Model, Schema } from 'mongoose';
import {
  DEFAULT_PAYMENT_EXPERIENCE,
  PAYMENT_EXPERIENCES,
  type PaymentExperience,
} from '@/lib/checkout/paymentExperience';

export interface ICheckoutSettings extends Document {
  tenantId: string;
  paymentExperience: PaymentExperience;
  createdAt: Date;
  updatedAt: Date;
}

const CheckoutSettingsSchema = new Schema<ICheckoutSettings>({
  tenantId: {
    type: String,
    required: true,
    default: 'default',
    trim: true,
    lowercase: true,
  },
  paymentExperience: {
    type: String,
    required: true,
    enum: PAYMENT_EXPERIENCES,
    default: DEFAULT_PAYMENT_EXPERIENCE,
  },
}, { timestamps: true, minimize: false });

CheckoutSettingsSchema.index({ tenantId: 1 }, { unique: true });

const CheckoutSettings: Model<ICheckoutSettings> =
  (mongoose.models.CheckoutSettings as Model<ICheckoutSettings> | undefined)
  || mongoose.model<ICheckoutSettings>('CheckoutSettings', CheckoutSettingsSchema);

export default CheckoutSettings;
