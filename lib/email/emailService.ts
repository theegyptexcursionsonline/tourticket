// lib/email/emailService.ts
import { TemplateEngine } from './templateEngine';
import { sendEmail } from '../mailgun';
import { generateBookingVerificationURL } from '@/lib/utils/qrcode';
import { generateReceiptPdf, ReceiptPayload } from '@/lib/utils/generateReceiptPdf';
import type {
  EmailType,
  BookingEmailData,
  PaymentEmailData,
  BankTransferEmailData,
  TripReminderData,
  TripCompletionData,
  CancellationData,
  WelcomeEmailData,
  AdminAlertData,
  BookingStatusUpdateData,
  AdminInviteEmailData,
  AdminAccessUpdateEmailData,
  OperatorBookingUpdateData,
  EmailTemplate
} from './type';

export class EmailService {
  private static readonly subjects: Record<EmailType, string> = {
    'booking-confirmation': '🎉 Booking Confirmed - {{tourTitle}}',
    'payment-confirmation': '✅ Payment Confirmed - {{tourTitle}}',
    'bank-transfer-instructions': '🏦 Bank Transfer Instructions - {{tourTitle}}',
    'trip-reminder': '⏰ Your Trip is Tomorrow - {{tourTitle}}',
    'trip-completion': '🌟 Thank You for Traveling with Us!',
    'booking-cancellation': '❌ Booking Cancelled - {{tourTitle}}',
    'booking-update': '📢 Booking Status Update - {{tourTitle}}',
    'welcome': '🎊 Welcome to Egypt Excursions Online!',
    'admin-booking-alert': '📋 New Booking Alert - {{tourTitle}}',
    'admin-invite': "You've been invited to manage Egypt Excursions Online",
    'admin-access-update': 'Your admin access has been {{action}}',
    'operator-booking-update': '🔔 Booking Updated - {{bookingId}} - {{tourTitle}}'
  };

  private static async generateEmailTemplate(
    type: EmailType,
    data: Record<string, any>
  ): Promise<EmailTemplate> {
    try {
      const templateData = {
        year: new Date().getFullYear(),
        ...data,
      };
      const htmlTemplate = await TemplateEngine.loadTemplate(type);
      const html = TemplateEngine.replaceVariables(htmlTemplate, templateData);
      const subject = TemplateEngine.generateSubject(this.subjects[type], templateData);
      return { subject, html };
    } catch (error) {
      console.error(`Error generating email template for ${type}:`, error);
      throw error;
    }
  }

  // BOOKING CONFIRMATION
  static async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    // Generate QR code for booking verification
    const verificationUrl = generateBookingVerificationURL(data.bookingId);
    let qrCodeBuffer: Buffer | null = null;
    let receiptPdfBuffer: Buffer | null = null;

    try {
      // Import the buffer generation function
      const { generateQRCodeBuffer } = await import('@/lib/utils/qrcode');
      qrCodeBuffer = await generateQRCodeBuffer(verificationUrl, {
        width: 300,
        margin: 2,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }

    // Generate receipt PDF using the same format as the checkout page
    try {
      const parseMoney = (value: unknown): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value !== 'string') return undefined;
        // Normalize EU decimals (comma) and strip currency symbols/whitespace
        const normalized = value.replace(/\s/g, '').replace(/,/g, '.');
        const cleaned = normalized.replace(/[^0-9.-]/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      // Build receipt payload matching the checkout page format exactly
      const receiptPayload: ReceiptPayload = {
        orderId: data.bookingId,
        customer: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone,
        },
        orderedItems: (data.orderedItems || []).map(item => ({
          title: item.title,
          quantity: item.quantity ?? item.adults ?? 1,
          childQuantity: item.childQuantity ?? item.children ?? 0,
          infantQuantity: item.infantQuantity ?? item.infants ?? 0,
          price: item.price,
          totalPrice: parseMoney((item as any).totalPrice),
          selectedBookingOption: item.selectedBookingOption,
        })),
        pricing: data.pricingRaw || {
          symbol: data.pricingDetails?.currencySymbol || '$',
          subtotal: parseMoney(data.pricingDetails?.subtotal) ?? 0,
          serviceFee: parseMoney(data.pricingDetails?.serviceFee) ?? 0,
          tax: parseMoney(data.pricingDetails?.tax) ?? 0,
          discount: parseMoney(data.pricingDetails?.discount) ?? 0,
          total: parseMoney(data.pricingDetails?.total) ?? parseMoney(data.totalPrice) ?? 0,
        },
        booking: {
          date: data.bookingDate,
          time: data.bookingTime,
          tourTitle: data.tourTitle, // Pass tour title for PDF fallback
          guests: typeof data.participants === 'string' 
            ? parseInt(data.participants) || 1 
            : 1,
        },
        qrData: verificationUrl,
      };

      receiptPdfBuffer = await generateReceiptPdf(receiptPayload);
      console.log(`📄 Generated receipt PDF: ${receiptPdfBuffer.length} bytes`);
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
    }

    // Add QR code CID reference to email data
    const emailData = {
      ...data,
      verificationUrl,
      qrCodeCid: qrCodeBuffer ? 'booking-qr-code' : undefined,
    };

    try {
      const template = await this.generateEmailTemplate('booking-confirmation', emailData);

      // Build inline attachments (QR code for email body)
      const inlineAttachments = qrCodeBuffer ? [
        {
          filename: 'qr-code.png',
          data: qrCodeBuffer,
          cid: 'booking-qr-code'
        }
      ] : [];

      // Build regular attachments (receipt PDF)
      const attachments = receiptPdfBuffer ? [
        {
          filename: `booking-ticket-${data.bookingId}.pdf`,
          data: receiptPdfBuffer,
          contentType: 'application/pdf'
        }
      ] : [];

      await sendEmail({
        to: data.customerEmail,
        subject: template.subject,
        html: template.html,
        type: 'booking-confirmation',
        inlineAttachments,
        attachments
      });

      console.log(`✅ Booking confirmation sent with QR code and receipt PDF attached`);
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      // Fallback: send email without attachments
      const fallbackData = {
        ...data,
        verificationUrl,
      };
      const template = await this.generateEmailTemplate('booking-confirmation', fallbackData);
      await sendEmail({
        to: data.customerEmail,
        subject: template.subject,
        html: template.html,
        type: 'booking-confirmation'
      });
    }
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

  // BANK TRANSFER INSTRUCTIONS
  static async sendBankTransferInstructions(data: BankTransferEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('bank-transfer-instructions', data);
    await sendEmail({
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      type: 'bank-transfer-instructions'
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
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

    if (!adminEmail) {
      console.warn('ADMIN_NOTIFICATION_EMAIL is not set. Skipping admin notification.');
      return;
    }

    const template = await this.generateEmailTemplate('admin-booking-alert', data);
    await sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-booking-alert'
    });
  }

  static async sendAdminInviteEmail(data: AdminInviteEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('admin-invite', data);
    await sendEmail({
      to: data.inviteeEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-invite'
    });
  }

  static async sendAdminAccessUpdateEmail(data: AdminAccessUpdateEmailData): Promise<void> {
    const template = await this.generateEmailTemplate('admin-access-update', data);
    await sendEmail({
      to: data.inviteeEmail,
      subject: template.subject,
      html: template.html,
      type: 'admin-access-update'
    });
  }

  // OPERATOR BOOKING UPDATE (sent when admin edits a booking)
  static async sendOperatorBookingUpdate(data: OperatorBookingUpdateData): Promise<void> {
    const operatorEmail = process.env.OPERATOR_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;

    if (!operatorEmail) {
      console.warn('OPERATOR_NOTIFICATION_EMAIL and ADMIN_NOTIFICATION_EMAIL are not set. Skipping operator notification.');
      return;
    }

    const template = await this.generateEmailTemplate('operator-booking-update', data);
    await sendEmail({
      to: operatorEmail,
      subject: template.subject,
      html: template.html,
      type: 'operator-booking-update'
    });
  }
}