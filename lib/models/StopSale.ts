// lib/models/StopSale.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStopSale extends Document {
  tourId: mongoose.Types.ObjectId;
  optionIds: string[];
  startDate: Date;
  endDate: Date;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StopSaleSchema = new Schema<IStopSale>(
  {
    tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true, index: true },
    optionIds: { type: [String], default: [] },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    reason: { type: String, trim: true },
  },
  { timestamps: true },
);

StopSaleSchema.index({ tourId: 1, startDate: 1, endDate: 1 });
StopSaleSchema.index({ tourId: 1, startDate: 1, endDate: 1, optionIds: 1 }, { unique: true });

const StopSale: Model<IStopSale> =
  mongoose.models.StopSale || mongoose.model<IStopSale>('StopSale', StopSaleSchema);

export default StopSale;
