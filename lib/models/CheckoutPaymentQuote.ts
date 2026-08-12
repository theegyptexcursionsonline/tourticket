import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface ICheckoutPaymentQuote extends Document {
  paymentIntentId: string;
  quoteBinding: string;
  checkoutAttemptId?: string;
  tenantId: string;
  checkoutSessionId?: string;
  paymentExperience?: 'inline' | 'modal' | 'hosted';
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    emergencyContact?: string;
    hotelPickupDetails?: string;
    hotelPickupLocation?: { lat: number; lng: number; name?: string; address?: string; placeId?: string };
    specialRequests?: string;
  };
  cart: unknown[];
  cartSummary: unknown[];
  pricing: {
    subtotal: number;
    serviceFee: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
  };
  discountCode?: string;
  discountUsageRecordedAt?: Date;
  inventoryState?: 'held' | 'converted' | 'released' | 'refunding' | 'refunded' | 'refund_failed';
  inventoryRefundId?: string;
  inventoryFailureReason?: string;
  inventoryUpdatedAt?: Date;
  expiresAt: Date;
}

const CheckoutPaymentQuoteSchema = new Schema<ICheckoutPaymentQuote>({
  paymentIntentId: { type: String, required: true, unique: true, index: true },
  quoteBinding: { type: String, required: true },
  checkoutAttemptId: {
    type: String,
    lowercase: true,
    match: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
  tenantId: { type: String, required: true, default: 'default', index: true },
  checkoutSessionId: { type: String, index: true, sparse: true },
  paymentExperience: { type: String, enum: ['inline', 'modal', 'hosted'] },
  customer: {
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, maxlength: 50 },
    emergencyContact: { type: String, maxlength: 200 },
    hotelPickupDetails: { type: String, maxlength: 300 },
    hotelPickupLocation: {
      lat: { type: Number },
      lng: { type: Number },
      name: { type: String, maxlength: 200 },
      address: { type: String, maxlength: 300 },
      placeId: { type: String, maxlength: 200 },
    },
    specialRequests: { type: String, maxlength: 2_000 },
  },
  cart: { type: [Schema.Types.Mixed], required: true },
  cartSummary: { type: [Schema.Types.Mixed], required: true },
  pricing: {
    subtotal: { type: Number, required: true },
    serviceFee: { type: Number, required: true },
    tax: { type: Number, required: true },
    discount: { type: Number, required: true },
    total: { type: Number, required: true },
    currency: { type: String, required: true, enum: ['USD'] },
  },
  discountCode: { type: String },
  discountUsageRecordedAt: { type: Date },
  inventoryState: {
    type: String,
    enum: ['held', 'converted', 'released', 'refunding', 'refunded', 'refund_failed'],
  },
  inventoryRefundId: { type: String },
  inventoryFailureReason: { type: String },
  inventoryUpdatedAt: { type: Date },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, minimize: false });

CheckoutPaymentQuoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CheckoutPaymentQuote: Model<ICheckoutPaymentQuote> =
  (mongoose.models.CheckoutPaymentQuote as Model<ICheckoutPaymentQuote> | undefined)
  || mongoose.model<ICheckoutPaymentQuote>('CheckoutPaymentQuote', CheckoutPaymentQuoteSchema);

export default CheckoutPaymentQuote;
