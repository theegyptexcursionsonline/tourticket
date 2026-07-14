import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

export type CheckoutInventoryHoldState = 'active' | 'converted' | 'released' | 'expired';

export interface ICheckoutInventoryHold extends Document {
  tenantId: string;
  reservationKey: string;
  paymentIntentId?: string;
  itemIndex: number;
  tourId: Types.ObjectId;
  date: Date;
  dateString: string;
  time: string;
  optionKey: string;
  guests: number;
  state: CheckoutInventoryHoldState;
  expiresAt: Date;
  convertedBookingId?: Types.ObjectId;
  releaseReason?: string;
  releasedAt?: Date;
  convertedAt?: Date;
  cleanupAt: Date;
}

const CheckoutInventoryHoldSchema = new Schema<ICheckoutInventoryHold>({
  tenantId: { type: String, required: true, default: 'default' },
  reservationKey: { type: String, required: true },
  paymentIntentId: { type: String },
  itemIndex: { type: Number, required: true, min: 0 },
  tourId: { type: Schema.Types.ObjectId, ref: 'Tour', required: true },
  date: { type: Date, required: true },
  dateString: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, required: true, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
  optionKey: { type: String, required: true },
  guests: { type: Number, required: true, min: 1, max: 50 },
  state: { type: String, enum: ['active', 'converted', 'released', 'expired'], required: true, default: 'active' },
  expiresAt: { type: Date, required: true },
  convertedBookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  releaseReason: { type: String },
  releasedAt: { type: Date },
  convertedAt: { type: Date },
  cleanupAt: { type: Date, required: true },
}, { timestamps: true, minimize: false });

CheckoutInventoryHoldSchema.index(
  { tenantId: 1, reservationKey: 1, itemIndex: 1 },
  { unique: true, name: 'tenant_reservation_item_unique' },
);
CheckoutInventoryHoldSchema.index(
  { tenantId: 1, tourId: 1, date: 1, time: 1, state: 1, expiresAt: 1 },
  { name: 'inventory_hold_scope_active' },
);
CheckoutInventoryHoldSchema.index(
  { tenantId: 1, paymentIntentId: 1, itemIndex: 1 },
  {
    unique: true,
    name: 'tenant_payment_hold_item_unique',
    partialFilterExpression: { paymentIntentId: { $type: 'string' } },
  },
);
CheckoutInventoryHoldSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0, name: 'inventory_hold_cleanup' });

const CheckoutInventoryHold: Model<ICheckoutInventoryHold> =
  (mongoose.models.CheckoutInventoryHold as Model<ICheckoutInventoryHold> | undefined)
  || mongoose.model<ICheckoutInventoryHold>('CheckoutInventoryHold', CheckoutInventoryHoldSchema);

export default CheckoutInventoryHold;
