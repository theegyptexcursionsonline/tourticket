import mongoose, { Document, Schema, Model } from 'mongoose';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  AdminPermission,
  AdminRole,
  DEFAULT_ADMIN_ROLE,
  getDefaultPermissions,
} from '@/lib/constants/adminPermissions';
import type { AdminPortalScope } from '@/lib/auth/adminPortalScope';
import { WORK_EMAIL_PATTERN } from '@/lib/validation/email';

// Cart item interface for storing in user document
export interface ICartItem {
  tourId: mongoose.Types.ObjectId;
  tourSlug: string;
  tourTitle: string;
  tourImage?: string;
  selectedDate: string;
  selectedTime?: string;
  quantity: number;
  childQuantity?: number;
  infantQuantity?: number;
  adultPrice: number;
  childPrice?: number;
  selectedBookingOption?: {
    id?: string;
    pricingKey?: string;
    title?: string;
    price?: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  guestPrices?: {
    adult: number;
    child: number;
    infant: number;
  };
  priceVersion?: number;
  priceExecutionId?: string | null;
  priceOverrideId?: string | null;
  priceSource?: 'catalogue' | 'override';
  addOnQuantityVersion?: 1;
  selectedAddOns?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    perGuest?: boolean;
  }>;
  uniqueId: string;
  addedAt: Date;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  password?: string; // Password is required for creation, but shouldn't be sent to client
  firebaseUid?: string; // Legacy provider identifier; retained only for non-destructive record compatibility.
  authProvider?: 'firebase' | 'jwt' | 'google'; // Historical marker. New and recovered accounts use the platform JWT store.
  isGuestProfile: boolean; // Passwordless booking profile, safe to claim only through strict auth flows
  photoURL?: string; // Optional profile photo URL retained from legacy records.
  emailVerified?: boolean; // Email ownership verification status.
  createdAt: Date;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  deactivatedAt?: Date;
  deactivatedBy?: string;
  lastLoginAt?: Date;
  adminLoginAttempts: number;
  adminLockUntil?: Date;
  invitationToken?: string;
  invitationExpires?: Date;
  // Platform-owned password recovery. Only the SHA-256 hash of the emailed
  // token is kept, so a database read cannot yield live reset links.
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  requirePasswordChange?: boolean;
  // Admin access an invitee has been offered but has NOT yet accepted. Nothing
  // here grants access: the grant only moves onto role/permissions/scopes when
  // the invitation is accepted, so an existing customer keeps shopping with the
  // account they already had until then.
  pendingAdminRole?: AdminRole;
  pendingAdminPermissions?: AdminPermission[];
  pendingAdminScopes?: AdminPortalScope[];
  pendingAdminInvitedAt?: Date;
  pendingAdminInvitedBy?: string;
  adminPortalScopes?: AdminPortalScope[];
  formerAdminScopes?: AdminPortalScope[];
  formerAdminTenantIds?: string[];
  tenantIds?: string[];
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorPendingSecret?: string;
  twoFactorRecoveryCodeHashes?: string[];
  twoFactorRecoveryPending?: boolean;
  twoFactorEnabledAt?: Date;
  twoFactorLastUsedStep?: number;
  wishlist?: mongoose.Types.ObjectId[]; // Array of Tour IDs
  cart?: ICartItem[]; // Array of cart items
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
      WORK_EMAIL_PATTERN,
      'Please provide a valid email address.',
    ],
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  country: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  password: {
    type: String,
    required: false, // Legacy and checkout-created guest records may be passwordless until recovery.
    minlength: 8,
    select: false, // Do not send password field in query results by default
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness for non-null values
    select: false, // Don't include in queries by default
  },
  authProvider: {
    type: String,
    enum: ['firebase', 'jwt', 'google'],
    default: 'jwt', // Default to JWT for backward compatibility with admin users
  },
  isGuestProfile: {
    type: Boolean,
    default: false,
    index: true,
  },
  photoURL: {
    type: String,
  },
  emailVerified: {
    type: Boolean,
    default: false,
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
  deactivatedAt: { type: Date },
  deactivatedBy: { type: String, trim: true, maxlength: 255 },
  lastLoginAt: {
    type: Date,
  },
  adminLoginAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  adminLockUntil: {
    type: Date,
    select: false,
  },
  invitationToken: {
    type: String,
    select: false, // Don't include in queries by default
  },
  invitationExpires: {
    type: Date,
    select: false,
  },
  passwordResetTokenHash: {
    type: String,
    select: false, // A bearer credential for the account — never returned by default
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },
  requirePasswordChange: {
    type: Boolean,
    default: false,
  },
  pendingAdminRole: {
    type: String,
    enum: ADMIN_ROLES.filter((role) => role !== 'customer'),
  },
  pendingAdminPermissions: {
    type: [String],
    enum: ADMIN_PERMISSIONS,
    default: undefined,
  },
  pendingAdminScopes: {
    type: [String],
    enum: ['main', 'multiTenant'],
    default: undefined,
  },
  pendingAdminInvitedAt: { type: Date },
  pendingAdminInvitedBy: { type: String, trim: true, maxlength: 255 },
  adminPortalScopes: {
    type: [String],
    enum: ['main', 'multiTenant'],
    default: undefined,
  },
  // Revoking team access preserves the customer identity. These markers keep
  // former members recoverable and make permanent deletion an explicit action.
  formerAdminScopes: {
    type: [String],
    enum: ['main', 'multiTenant'],
    default: undefined,
  },
  formerAdminTenantIds: {
    type: [String],
    default: undefined,
  },
  tenantIds: {
    type: [String],
    default: undefined,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: { type: String, select: false },
  twoFactorPendingSecret: { type: String, select: false },
  twoFactorRecoveryCodeHashes: { type: [String], select: false, default: undefined },
  twoFactorRecoveryPending: { type: Boolean, default: false },
  twoFactorEnabledAt: { type: Date },
  twoFactorLastUsedStep: { type: Number, select: false },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Tour',
  }],
  cart: [{
    tourId: { type: Schema.Types.ObjectId, ref: 'Tour', required: true },
    tourSlug: { type: String, required: true },
    tourTitle: { type: String, required: true },
    tourImage: { type: String },
    selectedDate: { type: String, required: true },
    selectedTime: { type: String },
    quantity: { type: Number, required: true, default: 1 },
    childQuantity: { type: Number, default: 0 },
    infantQuantity: { type: Number, default: 0, min: 0, max: 50 },
    adultPrice: { type: Number, required: true },
    childPrice: { type: Number },
    selectedBookingOption: {
      id: String,
      pricingKey: String,
      title: String,
      price: { type: Number, min: 0 },
      originalPrice: { type: Number, min: 0 },
      duration: String,
      badge: String,
    },
    guestPrices: {
      adult: { type: Number, min: 0 },
      child: { type: Number, min: 0 },
      infant: { type: Number, min: 0 },
    },
    priceVersion: { type: Number, min: 0 },
    priceExecutionId: { type: String },
    priceOverrideId: { type: String },
    priceSource: { type: String, enum: ['catalogue', 'override'] },
    addOnQuantityVersion: { type: Number, enum: [1], required: false },
    selectedAddOns: [{
      id: String,
      name: String,
      price: Number,
      quantity: Number,
      category: String,
      perGuest: { type: Boolean, default: false },
    }],
    uniqueId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  }],
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
