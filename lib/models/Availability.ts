// lib/models/Availability.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISlot {
  time: string;
  capacity: number;
  booked: number;
  blocked: boolean;
  blockReason?: string;
  price?: number;
  extraCapacity?: number;
}

export interface IAvailability extends Document {
  tour: mongoose.Types.ObjectId;
  option?: mongoose.Types.ObjectId;
  date: Date;
  slots: ISlot[];
  stopSale: boolean;
  stopSaleReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema = new Schema<ISlot>({
  time: { type: String, required: true, trim: true },
  capacity: { type: Number, required: true, default: 10, min: 0 },
  booked: { type: Number, required: true, default: 0, min: 0 },
  blocked: { type: Boolean, default: false },
  blockReason: { type: String, trim: true },
  price: { type: Number, min: 0 },
  extraCapacity: { type: Number, default: 0, min: 0 },
}, { _id: false });

const AvailabilitySchema: Schema<IAvailability> = new Schema({
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: [true, 'Tour is required'],
    index: true,
  },
  option: { type: mongoose.Schema.Types.ObjectId, ref: 'TourOption' },
  date: { type: Date, required: [true, 'Date is required'], index: true },
  slots: { type: [SlotSchema], default: [] },
  stopSale: { type: Boolean, default: false },
  stopSaleReason: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

AvailabilitySchema.index({ tour: 1, date: 1 }, { unique: true });
AvailabilitySchema.index({ tour: 1, date: 1, stopSale: 1 });

AvailabilitySchema.virtual('totalCapacity').get(function (this: IAvailability) {
  return this.slots.reduce((sum, slot) => sum + slot.capacity + (slot.extraCapacity || 0), 0);
});

AvailabilitySchema.virtual('totalBooked').get(function (this: IAvailability) {
  return this.slots.reduce((sum, slot) => sum + slot.booked, 0);
});

AvailabilitySchema.virtual('availableCapacity').get(function (this: IAvailability) {
  return this.slots.reduce((sum, slot) => {
    if (slot.blocked) return sum;
    return sum + (slot.capacity + (slot.extraCapacity || 0) - slot.booked);
  }, 0);
});

const Availability: Model<IAvailability> =
  mongoose.models.Availability || mongoose.model<IAvailability>('Availability', AvailabilitySchema);

export default Availability;
