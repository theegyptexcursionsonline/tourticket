// lib/models/Booking.ts (Complete - Nothing Omitted)
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Document, Schema, Model } from 'mongoose';

// Edit history entry interface for tracking changes
export interface IBookingEditHistoryEntry {
  editedAt: Date;
  editedBy: string; // admin user id or email
  editedByName?: string; // admin user name for display
  field: string; // which field was changed
  previousValue: string;
  newValue: string;
  changeType: 'status_change' | 'detail_update' | 'refund';
}

// Booking status type - includes new refund statuses
export type BookingStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'Refunded' | 'Partial_Refund';

// Array of valid statuses for validation
export const BOOKING_STATUSES: BookingStatus[] = ['Confirmed', 'Pending', 'Completed', 'Cancelled', 'Refunded', 'Partial_Refund'];

export interface IBooking extends Document {
  tenantId: string;
  bookingReference: string;
  tour: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  date: Date;
  dateString?: string; // YYYY-MM-DD format - timezone-safe for display
  time: string;
  guests: number;
  totalPrice: number;
  currency: string; // Currency code (USD, EUR, etc.)
  status: BookingStatus;
  source?: 'online' | 'manual';
  paymentStatus?: 'paid' | 'pending';
  amountPaid?: number;
  paymentConfirmedAt?: Date;
  paymentConfirmedBy?: string;
  inventoryReservationState?: 'pending_conversion' | 'converted' | 'booking_authoritative';
  inventoryReservationFailureCode?: string;
  inventoryReservationFinalizedAt?: Date;
  commerceContractVersion?: string;
  commerceQuoteVersion?: string;
  commerceTargetBinding?: string;
  checkoutAttemptId?: string;
  paymentId?: string;
  paymentItemIndex?: number;
  confirmationSentAt?: Date;
  confirmationEmailFailedAt?: Date;
  confirmationEmailFailureCode?: string;
  operatorNotificationSentAt?: Date;
  operatorNotificationFailedAt?: Date;
  operatorNotificationFailureCode?: string;
  paymentMethod?: string;
  specialRequests?: string;
  customerPhone?: string;
  customerCountry?: string;
  pickupLocation?: string;
  pickupAddress?: string;
  internalNotes?: string;
  emergencyContact?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    address: string;
    lat: number;
    lng: number;
    placeId?: string;
    name?: string; // Hotel name for better display
  };
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  selectedAddOns?: { [key: string]: number };
  selectedBookingOption?: {
    id: string;
    pricingKey?: string;
    title: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  priceSnapshot?: {
    guestPrices: { adult: number; child: number; infant: number };
    version: number;
    executionId?: string;
    overrideId?: string;
    source?: 'catalogue' | 'override' | 'manual';
    capturedAt: Date;
  };
  selectedAddOnDetails?: {
    [key: string]: {
      id: string;
      title: string;
      price: number;
      category?: string;
      perGuest?: boolean;
    };
  };
  // Edit history tracking
  editHistory?: IBookingEditHistoryEntry[];
  // Refund tracking
  refundAmount?: number;
  refundDate?: Date;
  refundReason?: string;
  refundState?: 'not_required' | 'manual_required' | 'pending' | 'succeeded' | 'failed';
  refundRequestKey?: string;
  refundProviderIdempotencyKey?: string;
  refundProviderId?: string;
  refundPaymentIntentId?: string;
  refundChargeId?: string;
  refundRequestedAmount?: number;
  refundProviderStatus?: string;
  refundFailureCode?: string;
  refundKind?: 'customer_cancel' | 'admin_cancel' | 'admin_full' | 'admin_partial';
  refundSourceStatus?: BookingStatus;
  refundActor?: string;
  refundPolicyVersion?: string;
  refundRequestedAt?: Date;
  refundCompletedAt?: Date;
  refundNotificationSentAt?: Date;
  refundNotificationState?: 'sending' | 'sent' | 'failed';
  refundNotificationClaimToken?: string;
  refundNotificationClaimedAt?: Date;
  refundNotificationAttempts?: number;
  refundNotificationFailureCode?: string;
  // Discount tracking
  discountCode?: string;
  discountAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Edit history entry schema
const EditHistoryEntrySchema = new Schema({
  editedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  editedBy: {
    type: String,
    required: true,
  },
  editedByName: {
    type: String,
  },
  field: {
    type: String,
    required: true,
  },
  previousValue: {
    type: String,
    required: true,
  },
  newValue: {
    type: String,
    required: true,
  },
  changeType: {
    type: String,
    enum: ['status_change', 'detail_update', 'refund'],
    required: true,
  },
}, { _id: false });

const BookingSchema: Schema<IBooking> = new Schema({
  tenantId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
  },

  bookingReference: {
    type: String,
    required: true,
    unique: true,
  },
  
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true,
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid tour ID format'
    }
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: function(v: any) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid user ID format'
    }
  },
  
  date: {
    type: Date,
    required: true,
  },

  // Store original date string (YYYY-MM-DD) for timezone-safe display
  // This prevents timezone drift when displaying dates across different regions
  dateString: {
    type: String,
    match: /^\d{4}-\d{2}-\d{2}$/,
  },

  time: {
    type: String,
    required: true,
  },
  
  guests: {
    type: Number,
    required: true,
    min: 1,
  },
  
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    enum: ['USD', 'EUR', 'GBP', 'EGP', 'AED', 'CHF', 'CAD', 'AUD', 'SEK', 'DKK', 'NOK', 'JPY', 'KRW', 'CNY', 'INR', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR'],
  },
  
  status: {
    type: String,
    enum: BOOKING_STATUSES,
    default: 'Confirmed',
  },

  source: {
    type: String,
    enum: ['online', 'manual'],
    default: 'online',
    index: true,
  },

  paymentStatus: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending',
  },

  amountPaid: {
    type: Number,
    min: 0,
    default: 0,
  },

  paymentConfirmedAt: { type: Date },
  paymentConfirmedBy: { type: String, trim: true, maxlength: 255 },
  inventoryReservationState: {
    type: String,
    enum: ['pending_conversion', 'converted', 'booking_authoritative'],
  },
  inventoryReservationFailureCode: { type: String, maxlength: 200 },
  inventoryReservationFinalizedAt: { type: Date },
  commerceContractVersion: { type: String, maxlength: 100 },
  commerceQuoteVersion: { type: String, maxlength: 100 },
  commerceTargetBinding: { type: String, match: /^[a-f0-9]{64}$/ },
  checkoutAttemptId: {
    type: String,
    lowercase: true,
    match: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
  
  paymentId: {
    type: String,
    index: true,
  },

  paymentItemIndex: {
    type: Number,
    min: 0,
  },

  confirmationSentAt: {
    type: Date,
  },

  // "Nothing silent": when the booking-confirmation email fails, the failure
  // is recorded here so the admin UI can surface it (cleared on a later
  // successful send/resend).
  confirmationEmailFailedAt: {
    type: Date,
  },
  confirmationEmailFailureCode: {
    type: String,
    maxlength: 200,
  },

  // Operator/admin delivery is independent from the customer voucher. Keeping
  // separate state prevents an operator-mail outage from marking the customer
  // confirmation as failed and makes the failure visible to administrators.
  operatorNotificationSentAt: {
    type: Date,
  },
  operatorNotificationFailedAt: {
    type: Date,
  },
  operatorNotificationFailureCode: {
    type: String,
    maxlength: 200,
  },


  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'bank', 'cash', 'pay_later'],
    default: 'card',
  },
  
  specialRequests: {
    type: String,
    maxlength: 1000,
  },

  customerPhone: {
    type: String,
    trim: true,
    maxlength: 50,
  },

  customerCountry: {
    type: String,
    trim: true,
    maxlength: 100,
  },

  pickupLocation: {
    type: String,
    trim: true,
    maxlength: 200,
  },

  pickupAddress: {
    type: String,
    trim: true,
    maxlength: 300,
  },

  // Never expose operator-only notes through customer booking queries.
  internalNotes: {
    type: String,
    trim: true,
    maxlength: 2_000,
    select: false,
  },
  
  emergencyContact: {
    type: String,
    maxlength: 200,
  },
  
  hotelPickupDetails: {
    type: String,
    maxlength: 300,
  },
  
  hotelPickupLocation: {
    address: String,
    lat: Number,
    lng: Number,
    placeId: String,
    name: String, // Hotel name for better display
  },
  
  adultGuests: {
    type: Number,
    min: 0,
    default: 1,
  },
  
  childGuests: {
    type: Number,
    min: 0,
    default: 0,
  },
  
  infantGuests: {
    type: Number,
    min: 0,
    default: 0,
  },
  
  selectedAddOns: {
    type: Map,
    of: Number,
    default: new Map(),
  },

  selectedBookingOption: {
    type: {
      id: String,
      pricingKey: String,
      title: String,
      price: Number,
      originalPrice: Number,
      duration: String,
      badge: String,
    },
    required: false,
  },

  priceSnapshot: {
    type: {
      guestPrices: { adult: Number, child: Number, infant: Number },
      version: { type: Number, required: true },
      executionId: String,
      overrideId: String,
      source: { type: String, enum: ['catalogue', 'override', 'manual'] },
      capturedAt: { type: Date, required: true },
    },
    required: false,
  },

  selectedAddOnDetails: {
    type: Map,
    of: {
      id: String,
      title: String,
      price: Number,
      category: String,
      perGuest: Boolean,
    },
    default: new Map(),
  },

  // Edit history tracking
  editHistory: {
    type: [EditHistoryEntrySchema],
    default: [],
  },

  // Refund tracking
  refundAmount: {
    type: Number,
    min: 0,
  },
  refundDate: {
    type: Date,
  },
  refundReason: {
    type: String,
    maxlength: 500,
  },
  refundState: {
    type: String,
    enum: ['not_required', 'manual_required', 'pending', 'succeeded', 'failed'],
  },
  refundRequestKey: { type: String, maxlength: 100 },
  refundProviderIdempotencyKey: { type: String, maxlength: 255 },
  refundProviderId: { type: String, maxlength: 255 },
  refundPaymentIntentId: { type: String, maxlength: 255 },
  refundChargeId: { type: String, maxlength: 255 },
  refundRequestedAmount: { type: Number, min: 0 },
  refundProviderStatus: { type: String, maxlength: 100 },
  refundFailureCode: { type: String, maxlength: 200 },
  refundKind: {
    type: String,
    enum: ['customer_cancel', 'admin_cancel', 'admin_full', 'admin_partial'],
  },
  refundSourceStatus: { type: String, enum: BOOKING_STATUSES },
  refundActor: { type: String, maxlength: 255 },
  refundPolicyVersion: { type: String, maxlength: 100 },
  refundRequestedAt: { type: Date },
  refundCompletedAt: { type: Date },
  refundNotificationSentAt: { type: Date },
  refundNotificationState: {
    type: String,
    enum: ['sending', 'sent', 'failed'],
  },
  refundNotificationClaimToken: { type: String, maxlength: 100, select: false },
  refundNotificationClaimedAt: { type: Date },
  refundNotificationAttempts: { type: Number, min: 0, default: 0 },
  refundNotificationFailureCode: { type: String, maxlength: 200 },

  // Discount tracking
  discountCode: {
    type: String,
    maxlength: 50,
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for guest breakdown text
BookingSchema.virtual('guestBreakdown').get(function() {
  const parts = [];
  if (this.adultGuests && this.adultGuests > 0) parts.push(`${this.adultGuests} adult${this.adultGuests > 1 ? 's' : ''}`);
  if (this.childGuests && this.childGuests > 0) parts.push(`${this.childGuests} child${this.childGuests > 1 ? 'ren' : ''}`);
  if (this.infantGuests && this.infantGuests > 0) parts.push(`${this.infantGuests} infant${this.infantGuests > 1 ? 's' : ''}`);
  return parts.join(', ');
});

// Indexes for efficient queries
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ tour: 1, date: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ tenantId: 1, refundState: 1, updatedAt: 1 }, { name: 'tenant_refund_reconciliation' });
BookingSchema.index(
  { tenantId: 1, refundNotificationState: 1, refundNotificationClaimedAt: 1 },
  { name: 'tenant_refund_notification_monitoring' },
);
BookingSchema.index(
  { tenantId: 1, inventoryReservationState: 1, updatedAt: 1 },
  { name: 'tenant_inventory_reservation_monitoring' },
);
BookingSchema.index(
  { tenantId: 1, paymentId: 1, paymentItemIndex: 1 },
  {
    unique: true,
    name: 'tenant_payment_item_unique',
    partialFilterExpression: {
      paymentId: { $type: 'string' },
      paymentItemIndex: { $type: 'number' },
    },
  },
);
// bookingReference remains globally unique; payment item idempotency is tenant-scoped.

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
