import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A durable record of what the Stripe webhook did with each event.
 *
 * On 2026-08-07 a customer was charged $75.60, refunded five minutes later and
 * never booked. Reconstructing why took hours, because the only evidence was
 * Stripe's own dashboard and the timestamps on an inventory lease — every
 * decision this handler makes was `console.log` and nothing more.
 *
 * The outcomes worth seeing are the quiet ones: a payment refunded because the
 * tour could not be resolved, a cart that failed to parse, a booking skipped as
 * already confirmed. Each of those ends in a customer with no booking, and none
 * of them raise an error anywhere a person would look.
 */
export interface IWebhookProcessingLog extends Document {
  eventId: string;
  eventType: string;
  paymentId?: string;
  tenantId?: string;
  outcome: string;
  created: boolean;
  bookingReference?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  durationMs?: number;
  errorMessage?: string;
  createdAt: Date;
}

const WebhookProcessingLogSchema = new Schema<IWebhookProcessingLog>(
  {
    // Stripe's event id — unique so a retry updates the record rather than
    // multiplying it, and so the log itself cannot mislead about how many
    // times something happened.
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    paymentId: { type: String, index: true },
    tenantId: { type: String, index: true },
    // The handler's own reason string: missing_tour_refunded,
    // invalid_cart_refunded, already_confirmed, no_booking_data, created, …
    outcome: { type: String, required: true, index: true },
    created: { type: Boolean, default: false },
    bookingReference: { type: String },
    amount: { type: Number },
    currency: { type: String },
    customerEmail: { type: String },
    durationMs: { type: Number },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Long enough to investigate a dispute or a delayed complaint, and to answer
// "has this happened before"; short enough not to grow without bound.
WebhookProcessingLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });
// The query an investigation actually starts from: what did not book, recently.
WebhookProcessingLogSchema.index({ created: 1, createdAt: -1 });

const WebhookProcessingLog: Model<IWebhookProcessingLog> =
  mongoose.models.WebhookProcessingLog
  || mongoose.model<IWebhookProcessingLog>('WebhookProcessingLog', WebhookProcessingLogSchema);

export default WebhookProcessingLog;
