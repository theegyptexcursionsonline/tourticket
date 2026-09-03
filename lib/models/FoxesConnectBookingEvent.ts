import mongoose, { Schema, type Model } from 'mongoose';
import { FOXESCONNECT_BOOKING_EVENT_TYPES, type FoxesConnectBookingEventType } from '@/lib/integrations/foxesConnectBookingEvents';

export type FoxesConnectBookingEventStatus =
  | 'queued'
  | 'processing'
  | 'retryable'
  | 'uncertain'
  | 'superseded'
  | 'delivered'
  | 'failed';

export interface FoxesConnectBookingEventDocument {
  _id: string;
  eventId: string;
  bookingId: string;
  type: FoxesConnectBookingEventType;
  eventVersion: string;
  rawBody: string;
  bodySha256: string;
  status: FoxesConnectBookingEventStatus;
  attempts: number;
  availableAt: Date;
  leaseToken?: string;
  leaseExpiresAt?: Date;
  deliveredAt?: Date;
  lastErrorCode?: string;
  lastHttpStatus?: number;
  purgeAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FoxesConnectBookingEventSchema = new Schema<FoxesConnectBookingEventDocument>(
  {
    // Reuse the contract identity as Mongo's always-unique primary key. This
    // preserves idempotency even where production disables automatic
    // secondary-index creation.
    _id: { type: String, required: true, maxlength: 200 },
    eventId: { type: String, required: true, trim: true, maxlength: 200 },
    bookingId: { type: String, required: true, trim: true, maxlength: 80, index: true },
    type: { type: String, required: true, enum: FOXESCONNECT_BOOKING_EVENT_TYPES, index: true },
    eventVersion: { type: String, required: true, trim: true, maxlength: 40 },
    rawBody: { type: String, required: true, immutable: true, maxlength: 32 * 1024 },
    bodySha256: { type: String, required: true, immutable: true, match: /^[a-f0-9]{64}$/ },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'processing', 'retryable', 'uncertain', 'superseded', 'delivered', 'failed'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    availableAt: { type: Date, required: true, default: Date.now, index: true },
    leaseToken: { type: String, maxlength: 80 },
    leaseExpiresAt: { type: Date },
    deliveredAt: { type: Date },
    lastErrorCode: { type: String, maxlength: 80 },
    lastHttpStatus: { type: Number, min: 100, max: 599 },
    // Pending payloads contain the least customer context needed by the
    // contract. Retention is bounded even if an operator never repairs a
    // terminal integration error.
    purgeAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

FoxesConnectBookingEventSchema.index(
  { eventId: 1 },
  { unique: true, name: 'foxesconnect_booking_event_id_unique' },
);
FoxesConnectBookingEventSchema.index({ status: 1, availableAt: 1, createdAt: 1 });
FoxesConnectBookingEventSchema.index({ bookingId: 1, type: 1, eventVersion: 1 });

const FoxesConnectBookingEvent: Model<FoxesConnectBookingEventDocument> =
  (mongoose.models.FoxesConnectBookingEvent as Model<FoxesConnectBookingEventDocument> | undefined)
  || mongoose.model<FoxesConnectBookingEventDocument>(
    'FoxesConnectBookingEvent',
    FoxesConnectBookingEventSchema,
  );

export default FoxesConnectBookingEvent;
