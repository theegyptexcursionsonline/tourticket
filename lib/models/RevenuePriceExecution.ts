import mongoose, { Schema, type Model } from 'mongoose';

const PricesSchema = new Schema({ adult: Number, child: Number, infant: Number }, { _id: false });

const RevenuePriceExecutionSchema = new Schema({
  executionId: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  recommendationId: { type: String, required: true },
  actor: { type: String, required: true },
  mode: { type: String, enum: ['manual', 'assist', 'autopilot', 'rollback'], required: true },
  target: {
    tourId: { type: Schema.Types.ObjectId, ref: 'Tour', required: true },
    optionKey: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
  },
  currency: { type: String, required: true },
  expectedVersion: { type: Number, required: true },
  appliedVersion: { type: Number },
  previousPrices: PricesSchema,
  requestedPrices: PricesSchema,
  effectivePrices: PricesSchema,
  policyHash: { type: String, required: true },
  sourceVersion: { type: String, required: true },
  requestHash: { type: String, required: true },
  state: { type: String, enum: ['applied', 'replayed', 'conflict', 'blocked', 'verified', 'rollback_applied', 'rollback_failed'], required: true },
  readbackAttempts: { type: [Schema.Types.Mixed], default: [] },
  events: { type: [Schema.Types.Mixed], default: [] },
  rollbackExecutionId: { type: String },
}, { timestamps: true, minimize: false });

const RevenuePriceExecution: Model<any> = mongoose.models.RevenuePriceExecution
  || mongoose.model('RevenuePriceExecution', RevenuePriceExecutionSchema);

export default RevenuePriceExecution;
