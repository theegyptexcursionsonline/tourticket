// lib/email/types.ts

export interface BaseEmailData {
  customerName: string;
  customerEmail: string;
}

export interface BookingEmailData extends BaseEmailData {
  tourTitle: string;
  bookingDate: string;
  bookingTime: string;
  participants: string;
  totalPrice: string;
  bookingId: string;
  specialRequests?: string;
  meetingPoint?: string;
  contactNumber?: string;
  tourImage?: string;
  baseUrl?: string;
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

export interface AdminAlertData {
  customerName: string;
  customerEmail: string;
  tourTitle: string;
  bookingId: string;
  bookingDate: string;
  totalPrice: string;
  paymentMethod?: string;
  specialRequests?: string;
  adminDashboardLink?: string;
  baseUrl?: string;
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

export type EmailType =
  | 'booking-confirmation'
  | 'payment-confirmation'
  | 'trip-reminder'
  | 'trip-completion'
  | 'booking-cancellation'
  | 'booking-update'
  | 'welcome'
  | 'admin-booking-alert';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}