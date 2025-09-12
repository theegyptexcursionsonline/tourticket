import mongoose, { Document, Schema, models } from 'mongoose';

export interface IDestination extends Document {
  name: string;
  slug: string;
  image: string;
}

const DestinationSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  image: { type: String, required: true }, // Cloudinary URL
});

export default models.Destination || mongoose.model<IDestination>('Destination', DestinationSchema);