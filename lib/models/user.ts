import mongoose, { Document, Schema, Model } from 'mongoose';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  AdminPermission,
  AdminRole,
  DEFAULT_ADMIN_ROLE,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Password is required for creation, but shouldn't be sent to client
  createdAt: Date;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  lastLoginAt?: Date;
  invitationToken?: string;
  invitationExpires?: Date;
  requirePasswordChange?: boolean;
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
  role: {
    type: String,
    enum: ADMIN_ROLES,
    default: DEFAULT_ADMIN_ROLE,
  },
  permissions: {
    type: [String],
    enum: ADMIN_PERMISSIONS,
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: {
    type: Date,
  },
  invitationToken: {
    type: String,
    select: false, // Don't include in queries by default
  },
  invitationExpires: {
    type: Date,
    select: false,
  },
  requirePasswordChange: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('save', function ensurePermissions(next) {
  if (!this.role) {
    this.role = DEFAULT_ADMIN_ROLE;
  }

  if ((!this.permissions || this.permissions.length === 0) && this.role !== 'customer') {
    this.permissions = getDefaultPermissions(this.role);
  }

  next();
});

// Avoid recompiling the model if it's already defined
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;