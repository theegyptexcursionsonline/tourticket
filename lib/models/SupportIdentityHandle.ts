import mongoose, { type Model, Schema } from 'mongoose';

export type SupportIdentityChannel = 'widget' | 'whatsapp';
export type SupportIdentityTool = 'booking_summary' | 'pickup_status' | 'booking_action';

export interface ISupportIdentityHandle {
  tenantId: string;
  tokenHash: string;
  booking: mongoose.Types.ObjectId;
  workspaceKey: string;
  conversationId: string;
  channel: SupportIdentityChannel;
  allowedTools: SupportIdentityTool[];
  expiresAt: Date;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SupportIdentityHandleSchema = new Schema<ISupportIdentityHandle>(
  {
    tenantId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    workspaceKey: { type: String, required: true, trim: true, maxlength: 80 },
    conversationId: { type: String, required: true, trim: true, maxlength: 120 },
    channel: { type: String, enum: ['widget', 'whatsapp'], required: true },
    allowedTools: {
      type: [String],
      enum: ['booking_summary', 'pickup_status', 'booking_action'],
      default: ['booking_summary', 'pickup_status', 'booking_action'],
    },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

SupportIdentityHandleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SupportIdentityHandleSchema.index({ tenantId: 1, booking: 1, expiresAt: -1 });
SupportIdentityHandleSchema.index(
  { tenantId: 1, workspaceKey: 1, conversationId: 1, channel: 1, revokedAt: 1 },
);

const SupportIdentityHandle: Model<ISupportIdentityHandle> =
  (mongoose.models.SupportIdentityHandle as Model<ISupportIdentityHandle>) ||
  mongoose.model<ISupportIdentityHandle>('SupportIdentityHandle', SupportIdentityHandleSchema);

export default SupportIdentityHandle;
