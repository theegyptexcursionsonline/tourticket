// lib/email/emailService.ts
import { TemplateEngine } from './templateEngine';
import { sendEmail } from '../mailgun';
import type {
  EmailType,
  BookingEmailData,
  PaymentEmailData,
  TripReminderData,
  TripCompletionData,
  CancellationData,
  WelcomeEmailData,
  AdminAlertData,
  BookingStatusUpdateData,
  EmailTemplate
} from './types';

export class EmailService {
  private static readonly subjects: Record<EmailType, string> = {
    'booking-confirmation': '🎉 Booking Confirmed - {{tourTitle}}',
    'payment-confirmation': '✅ Payment Confirmed - {{tourTitle}}',
    'trip-reminder': '⏰ Your Trip is Tomorrow - {{tourTitle}}',
    'trip-completion': '🌟 Thank You for Traveling with Us!',
    'booking-cancellation': '❌ Booking Cancelled - {{tourTitle}}',
    'booking-update': '📢 Booking Status Update - {{tourTitle}}',
    'welcome': '🎊 Welcome to Egypt Excursions Online!',
    'admin-booking-alert': '📋 New Booking Alert - {{tourTitle}}'
  };

  private static async generateEmailTemplate(
    type: EmailType,
    data: Record<string, unknown>
  ): Promise<EmailTemplate> {
    try {
      const htmlTemplate = await TemplateEngine.loadTemplate(type);
      const html = TemplateEngine.replaceVariables(htmlTemplate, data);
      const subject = TemplateEngine.generateSubject(this.subjects[type], data);
      return { subject, html };
    } catch (error) {
      console.error(`Error generating email template for ${type}:`, error);
      throw error;
    }
  }

  // BOOKING CONFIRMATION
  static async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('booking-confirmation', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'booking-confirmation'
    });
  }

  // PAYMENT CONFIRMATION
  static async sendPaymentConfirmation(data: PaymentEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('payment-confirmation', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'payment-confirmation'
    });
  }

  // TRIP REMINDER (24H BEFORE)
  static async sendTripReminder(data: TripReminderData): Promise<void> {
    const template = await this.generateEmailTemplate('trip-reminder', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'trip-reminder'
    });
  }

  // TRIP COMPLETION + REVIEW REQUEST
  static async sendTripCompletion(data: TripCompletionData): Promise<void> {
    const template = await this.generateEmailTemplate('trip-completion', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'trip-completion'
    });
  }

  // BOOKING CANCELLATION
  static async sendCancellationConfirmation(data: CancellationData): Promise<void> {
    const template = await this.generateEmailTemplate('booking-cancellation', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'booking-cancellation'
    });
  }

  // BOOKING STATUS UPDATE
  static async sendBookingStatusUpdate(data: BookingStatusUpdateData): Promise<void> {
    const template = await this.generateEmailTemplate('booking-update', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'booking-update'
    });
  }

  // WELCOME EMAIL
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('welcome', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'welcome'
    });
  }

  // ADMIN BOOKING ALERT
  static async sendAdminBookingAlert(data: AdminAlertData): Promise<void> {
    const template = await this.generateEmailTemplate('admin-booking-alert', data);
    await sendEmail({
      to: process.env.ADMIN_NOTIFICATION_EMAIL!,
      subject: template.subject,
      html: template.html,
      type: 'admin-booking-alert'
    });
  }
}