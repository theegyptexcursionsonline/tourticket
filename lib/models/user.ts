import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Password is required for creation, but shouldn't be sent to client
  createdAt: Date;
}

const UserSchema: Schema<IUser> = new Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide your first name.'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Please provide your last name.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email.'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address.',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
    minlength: 8,
    select: false, // Do not send password field in query results by default
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Avoid recompiling the model if it's already defined
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;