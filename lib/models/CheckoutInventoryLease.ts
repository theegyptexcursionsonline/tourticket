import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface ICheckoutInventoryLease extends Document {
  scopeKey: string;
  leaseToken?: string;
  leaseExpiresAt?: Date;
  cleanupAt: Date;
}

const CheckoutInventoryLeaseSchema = new Schema<ICheckoutInventoryLease>({
  scopeKey: { type: String, required: true },
  leaseToken: { type: String },
  leaseExpiresAt: { type: Date },
  cleanupAt: { type: Date, required: true },
}, { timestamps: true });

CheckoutInventoryLeaseSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0, name: 'inventory_lease_cleanup' });
CheckoutInventoryLeaseSchema.index({ scopeKey: 1 }, { unique: true, name: 'inventory_scope_unique' });

const CheckoutInventoryLease: Model<ICheckoutInventoryLease> =
  (mongoose.models.CheckoutInventoryLease as Model<ICheckoutInventoryLease> | undefined)
  || mongoose.model<ICheckoutInventoryLease>('CheckoutInventoryLease', CheckoutInventoryLeaseSchema);

export default CheckoutInventoryLease;
