// lib/models/Job.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IJob extends Document {
  title: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  description: string;
  link?: string;
  isActive: boolean;
  createdAt: Date;
}

const JobSchema: Schema<IJob> = new Schema({
  title: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], required: true },
  description: { type: String, required: true },
  link: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Avoid model overwrite error in development
const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;