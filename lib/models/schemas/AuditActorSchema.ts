import { Schema } from 'mongoose';
import type { AuditActor } from '@/lib/admin/auditStamp';

/**
 * Immutable identity snapshot used on content records. It deliberately is not
 * a user reference: author/editor history must survive team-member removal.
 */
export const AuditActorSchema = new Schema<AuditActor>({
  id: { type: String, trim: true },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
}, { _id: false });
