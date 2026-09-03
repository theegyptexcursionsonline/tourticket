import mongoose, { type Model, Schema } from 'mongoose';

/**
 * An operations request that FoxesConnect's assistant registered on behalf of a
 * VERIFIED customer (pickup change, booking change, cancellation, callback,
 * voucher resend). It is a request queue for the ops team — it never mutates a
 * booking by itself. Lifecycle:
 *   proposed  — registered while the customer's identity handle was live; not
 *               shown to operations yet (FoxesConnect staff still have to approve)
 *   received  — FoxesConnect approved; visible/actionable for operations
 *   withdrawn — rejected on the FoxesConnect side or expired
 *   in_progress / resolved — operations' own progress on a received request
 */
export const BOOKING_SUPPORT_ACTION_KINDS = [
  'request_pickup_change',
  'request_booking_change',
  'request_cancellation',
  'request_human_callback',
  'resend_voucher',
] as const;
export type BookingSupportActionKind = (typeof BOOKING_SUPPORT_ACTION_KINDS)[number];

export const BOOKING_SUPPORT_REQUEST_STATUSES = ['proposed', 'received', 'withdrawn', 'in_progress', 'resolved'] as const;
export type BookingSupportRequestStatus = (typeof BOOKING_SUPPORT_REQUEST_STATUSES)[number];

export interface IBookingSupportRequest {
  tenantId: string;
  requestId: string;
  booking: mongoose.Types.ObjectId;
  bookingReference: string;
  workspaceKey: string;
  conversationId: string;
  channel: 'widget' | 'whatsapp';
  actionKind: BookingSupportActionKind;
  customerRequest: string;
  language: string;
  idempotencyKey: string;
  status: BookingSupportRequestStatus;
  proposedAt: Date;
  confirmedAt?: Date | null;
  confirmedBy?: string | null;
  withdrawnAt?: Date | null;
  withdrawReason?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSupportRequestSchema = new Schema<IBookingSupportRequest>(
  {
    tenantId: { type: String, required: true, index: true },
    requestId: { type: String, required: true, unique: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    bookingReference: { type: String, required: true, trim: true, maxlength: 80 },
    workspaceKey: { type: String, required: true, trim: true, maxlength: 80 },
    conversationId: { type: String, required: true, trim: true, maxlength: 120 },
    channel: { type: String, enum: ['widget', 'whatsapp'], required: true },
    actionKind: { type: String, enum: BOOKING_SUPPORT_ACTION_KINDS, required: true },
    customerRequest: { type: String, required: true, maxlength: 600 },
    language: { type: String, required: true, maxlength: 8 },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 180 },
    status: { type: String, enum: BOOKING_SUPPORT_REQUEST_STATUSES, default: 'proposed', required: true, index: true },
    proposedAt: { type: Date, required: true },
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: String, default: null, maxlength: 120 },
    withdrawnAt: { type: Date, default: null },
    withdrawReason: { type: String, default: null, maxlength: 200 },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null, maxlength: 120 },
    resolutionNote: { type: String, default: null, maxlength: 600 },
  },
  { timestamps: true },
);

// One request per (tenant, workspace, idempotency key): a retried proposal is a duplicate, never a second row.
BookingSupportRequestSchema.index({ tenantId: 1, workspaceKey: 1, idempotencyKey: 1 }, { unique: true });
BookingSupportRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
BookingSupportRequestSchema.index({ tenantId: 1, booking: 1, createdAt: -1 });

const BookingSupportRequest: Model<IBookingSupportRequest> =
  (mongoose.models.BookingSupportRequest as Model<IBookingSupportRequest>) ||
  mongoose.model<IBookingSupportRequest>('BookingSupportRequest', BookingSupportRequestSchema);

export default BookingSupportRequest;
