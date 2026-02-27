// lib/models/StopSaleLog.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStopSaleLog extends Document {
  tourId: mongoose.Types.ObjectId;
  optionId: string | null;
  dateFrom: Date;
  dateTo: Date;
  reason: string;
  appliedBy: mongoose.Types.ObjectId;
  appliedAt: Date;
  removedBy: mongoose.Types.ObjectId | null;
  removedAt: Date | null;
  status: 'active' | 'removed';
  createdAt: Date;
  updatedAt: Date;
}

const StopSaleLogSchema = new Schema<IStopSaleLog>(
  {
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    optionId: { type: String, default: null },
    dateFrom: { type: Date, required: true, index: true },
    dateTo: { type: Date, required: true, index: true },
    reason: { type: String, default: '', trim: true },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appliedAt: { type: Date, required: true, default: Date.now },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    removedAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'removed'], default: 'active', index: true },
  },
  { timestamps: true },
);

StopSaleLogSchema.index({ status: 1, appliedAt: -1 });
StopSaleLogSchema.index({ tourId: 1, dateFrom: 1, dateTo: 1 });

const StopSaleLog: Model<IStopSaleLog> =
  mongoose.models.StopSaleLog || mongoose.model<IStopSaleLog>('StopSaleLog', StopSaleLogSchema);

export default StopSaleLog;
