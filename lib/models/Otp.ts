// lib/models/Otp.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otp: string;
  expires: Date;
  userData?: { // To hold temporary data for new users
    firstName?: string;
    lastName?: string;
  }
}

const OtpSchema: Schema<IOtp> = new Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expires: { type: Date, required: true, expires: 0 }, // Automatically deletes after expiry
  userData: {
      firstName: { type: String },
      lastName: { type: String }
  }
});

const Otp: Model<IOtp> = mongoose.models.Otp || mongoose.model<IOtp>('Otp', OtpSchema);
export default Otp;