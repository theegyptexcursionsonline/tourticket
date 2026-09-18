// lib/email/types.ts

export interface BaseEmailData {
  customerName: string;
  customerEmail: string;
  /**
   * Per-brand overrides for the sender identity. This deployment fulfils
   * payments for every white-label site, so a confirmation must go out under
   * the brand the customer actually bought from. Omitted for the main
   * storefront, which keeps the defaults.
   */
  companyName?: string;
  companyLogo?: string;
  primaryColor?: string;
  contactEmail?: string;
  supportEmail?: string;
  contactPhone?: string;
}

export interface BookingEmailData extends BaseEmailData {
  customerPhone?: string;
  tourTitle: string;
  bookingDate: string;
  bookingTime: string;
  participants: string;
  participantBreakdown?: string; // e.g., "2 x Adults (£22.4)"
  totalPrice: string;
  bookingId: string;
  bookingOption?: string; // Selected booking option name
  specialRequests?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
  hotelPickupMapImage?: string;
  hotelPickupMapLink?: string;
  meetingPoint?: string;
  contactNumber?: string;
  tourImage?: string;
  baseUrl?: string;
  qrCodeDataUrl?: string; // QR code as data URL for embedding in email
  verificationUrl?: string; // URL that the QR code points to
  dateBadge?: {
    dayLabel: string;
    dayNumber: number;
    monthLabel: string;
    year: number;
  };
  orderedItems?: Array<{
    title: string;
    image?: string;
    adults: number;
    children: number;
    infants: number;
    bookingOption?: string;
    totalPrice: string;
    // Additional fields for receipt PDF
    quantity?: number;
    childQuantity?: number;
    infantQuantity?: number;
    price?: number;
    selectedBookingOption?: {
      title: string;
      price: number;
    };
  }>;
  pricingDetails?: {
    subtotal: string;
    serviceFee: string;
    tax: string;
    discount?: string;
    total: string;
    currencySymbol: string;
  };
  // Raw pricing values for receipt PDF generation
  pricingRaw?: {
    subtotal: number;
    serviceFee: number;
    tax: number;
    discount: number;
    total: number;
    symbol: string;
  };
  timeUntil?: {
    days: number;
    hours: number;
    minutes: number;
  };
  // Promo code if applied
  discountCode?: string;
}

export interface PaymentEmailData extends BaseEmailData {
  paymentId: string;
  paymentMethod: string;
  amount: string;
  currency: string;
  bookingId: string;
  tourTitle: string;
  baseUrl?: string;
}

export interface TripReminderData extends BaseEmailData {
  tourTitle: string;
  bookingDate: string;
  bookingTime: string;
  meetingPoint: string;
  contactNumber: string;
  weatherInfo?: string;
  whatToBring?: string[];
  importantNotes?: string;
  bookingId: string;
  baseUrl?: string;
}

export interface TripCompletionData extends BaseEmailData {
  tourTitle: string;
  bookingDate: string;
  reviewLink: string;
  photoSharingLink?: string;
  recommendedTours?: Array<{
    title: string;
    image: string;
    price: string;
    link: string;
  }>;
  baseUrl?: string;
}

export interface CancellationData extends BaseEmailData {
  tourTitle: string;
  bookingDate: string;
  bookingId: string;
  refundAmount?: string;
  refundProcessingDays?: number;
  cancellationReason?: string;
  baseUrl?: string;
}

export interface WelcomeEmailData extends BaseEmailData {
  verificationLink?: string;
  dashboardLink: string;
  recommendedTours?: Array<{
    title: string;
    image: string;
    price: string;
    link: string;
  }>;
  baseUrl?: string;
}

export interface AdminAlertData extends BaseEmailData {
  customerPhone?: string;
  tourTitle: string;
  bookingId: string;
  bookingDate: string;
  totalPrice: string;
  paymentMethod?: string;
  specialRequests?: string;
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
  hotelPickupMapImage?: string;
  hotelPickupMapLink?: string;
  timeUntil?: {
    days: number;
    hours: number;
    minutes: number;
  };
  adminDashboardLink?: string;
  baseUrl?: string;
  /**
   * The tenant this booking belongs to. A named brand's alert must never fall
   * back to the platform inbox: that inbox belongs to a different company.
   */
  tenantId?: string;
  /** The brand's own operations address, from its tenant record. */
  notificationEmail?: string;
  tours?: Array<{
    title: string;
    date: string;
    time: string;
    adults: number;
    children: number;
    infants: number;
    bookingOption?: string;
    addOns?: string[];
    price: string;
  }>;
  dateBadge?: {
    dayLabel: string;
    dayNumber: number;
    monthLabel: string;
    year: number;
  };
  // Discount/Promo code info
  discountCode?: string;
  discountAmount?: string;
}

export interface BookingStatusUpdateData extends BaseEmailData {
  tourTitle: string;
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  newStatus: string;
  statusMessage: string;
  additionalInfo?: string;
  baseUrl?: string;
}

export interface OperatorBookingUpdateData extends BaseEmailData {
  bookingId: string;
  tourTitle: string;
  customerPhone?: string;
  /** See `AdminAlertData.tenantId` — same fail-closed rule. */
  tenantId?: string;
  /** The brand's own operations address, from its tenant record. */
  notificationEmail?: string;
  bookingDate: string;
  bookingTime: string;
  changesSummary: string;
  changedBy: string;
  changedAt: string;
  newStatus: string;
  baseUrl?: string;
  // Hotel pickup info
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };
  hotelPickupMapImage?: string;
  hotelPickupMapLink?: string;
  // Special requests
  specialRequests?: string;
  // Guest counts
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
}

export interface AdminInviteEmailData {
  inviteeName: string;
  inviteeEmail: string;
  inviterName: string;
  temporaryPassword: string;
  role: string;
  permissions: string[];
  portalLink: string;
  supportEmail?: string;
}

export interface AdminAccessUpdateEmailData {
  inviteeName: string;
  inviteeEmail: string;
  updatedBy?: string;
  action: 'activated' | 'deactivated' | 'permissions_updated' | 'deleted';
  portalLink: string;
  supportEmail?: string;
  isActivated?: boolean;
  /** Listed on a `permissions_updated` notice so the reader sees the new level. */
  permissions?: string[];
}

export interface BankTransferEmailData extends BaseEmailData {
  tourTitle: string;
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  participants: string;
  totalPrice: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  currency: string;
  specialRequests?: string;
  hotelPickupDetails?: string;
  baseUrl?: string;
}

export interface PasswordResetEmailData {
  customerEmail: string;
  /** Single-use, platform-issued reset link. */
  resetUrl: string;
  expiresInMinutes: number;
}

export interface PasswordChangedEmailData {
  customerName: string;
  customerEmail: string;
  /** Rendered in the account's own locale by the caller, with its time zone. */
  changedAt: string;
  method: 'reset-link' | 'account-settings';
}

export interface PaymentFailedEmailData {
  customerName: string;
  customerEmail: string;
  tourTitle: string;
  amount: string;
  /** Plain language, never the raw provider string. */
  reason: string;
  attemptedAt?: string;
  retryUrl?: string;
  baseUrl?: string;
}

export interface RefundIssuedEmailData extends BaseEmailData {
  tourTitle: string;
  bookingId: string;
  bookingDate: string;
  refundAmount: string;
  originalAmount?: string;
  refundType: 'full' | 'partial';
  refundProcessingDays?: number;
  refundReason?: string;
  newStatus: string;
  baseUrl?: string;
}

export interface EnquiryReceivedEmailData {
  customerName: string;
  customerEmail: string;
  message: string;
  /** Printed on both this acknowledgement and the internal copy. */
  enquiryReference: string;
  baseUrl?: string;
}

export type EmailType =
  | 'booking-confirmation'
  | 'payment-confirmation'
  | 'payment-failed'
  | 'bank-transfer-instructions'
  | 'trip-reminder'
  | 'trip-completion'
  | 'booking-cancellation'
  | 'booking-update'
  | 'refund-issued'
  | 'welcome'
  | 'password-reset'
  | 'password-changed'
  | 'enquiry-received'
  | 'admin-booking-alert'
  | 'admin-invite'
  | 'admin-access-update'
  | 'operator-booking-update';

export interface EmailTemplate {
  subject: string;
  html: string;
  /** Required: the standard gives every message a real plain-text alternative. */
  text: string;
}