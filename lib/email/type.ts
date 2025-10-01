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
}

export interface PaymentEmailData extends BaseEmailData {
  paymentId: string;
  paymentMethod: string;
  amount: string;
  currency: string;
  bookingId: string;
  tourTitle: string;
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
}

export interface CancellationData extends BaseEmailData {
  tourTitle: string;
  bookingDate: string;
  bookingId: string;
  refundAmount?: string;
  refundProcessingDays?: number;
  cancellationReason?: string;
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
}

export type EmailType = 
  | 'booking-confirmation'
  | 'payment-confirmation' 
  | 'trip-reminder'
  | 'trip-completion'
  | 'booking-cancellation'
  | 'welcome'
  | 'admin-booking-alert';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}