import mongoose, { Schema, type Model } from 'mongoose';

const RevenueMachineNonceSchema = new Schema({
  keyId: { type: String, required: true },
  nonce: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

RevenueMachineNonceSchema.index({ keyId: 1, nonce: 1 }, { unique: true });

const RevenueMachineNonce: Model<any> = mongoose.models.RevenueMachineNonce
  || mongoose.model('RevenueMachineNonce', RevenueMachineNonceSchema);

export default RevenueMachineNonce;
