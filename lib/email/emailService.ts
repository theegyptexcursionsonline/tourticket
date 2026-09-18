// lib/email/emailService.ts
import { renderEmailTemplate } from './render';
import { sendEmail, isValidEmailAddress, InvalidRecipientError } from '../mailgun';
import { generateBookingVerificationURL } from '@/lib/utils/qrcode';
import { generateReceiptPdf, ReceiptPayload } from '@/lib/utils/generateReceiptPdf';
import type {
  EmailType,
  BookingEmailData,
  PaymentEmailData,
  PaymentFailedEmailData,
  BankTransferEmailData,
  TripReminderData,
  TripCompletionData,
  CancellationData,
  RefundIssuedEmailData,
  WelcomeEmailData,
  AdminAlertData,
  BookingStatusUpdateData,
  AdminInviteEmailData,
  AdminAccessUpdateEmailData,
  OperatorBookingUpdateData,
  PasswordChangedEmailData,
  EnquiryReceivedEmailData,
  EmailTemplate,
} from './type';

/**
 * A Mailgun rejection that is specifically about the attachments on a message,
 * as opposed to a bad address, a template error or a transport timeout.
 *
 * Only these justify retrying the message without its attachments. Anything
 * else — including a timeout, which can occur AFTER Mailgun accepted the
 * message — must not trigger a second send, or the customer receives two
 * confirmations for one booking.
 */
function isAttachmentRejection(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const status = Number((error as { status?: unknown }).status);
  // 413 Payload Too Large / 400 Bad Request are the two Mailgun answers that a
  // too-large or malformed attachment actually produces.
  if (status !== 413 && status !== 400) return false;
  const details = [
    (error as { message?: unknown }).message,
    (error as { details?: unknown }).details,
  ].map((value) => String(value ?? '').toLowerCase()).join(' ');
  return /attach|inline|size|too large|payload/.test(details);
}

export class EmailService {
  private static generateEmailTemplate<T extends object>(type: EmailType, data: T): EmailTemplate {
    return renderEmailTemplate(type, data);
  }

  /** The display name on the envelope follows the brand the customer bought from. */
  private static fromName(data: { companyName?: string }): string | undefined {
    return data.companyName;
  }

  // BOOKING CONFIRMATION
  static async sendBookingConfirmation(data: BookingEmailData): Promise<void> {
    if (!isValidEmailAddress(data.customerEmail)) throw new InvalidRecipientError('customer');

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
          totalPrice: parseMoney(item.totalPrice),
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

    // Build inline attachments (QR code for email body)
    const inlineAttachments = qrCodeBuffer ? [
      {
        filename: 'qr-code.png',
        data: qrCodeBuffer,
        cid: 'booking-qr-code',
      },
    ] : [];

    // Build regular attachments (receipt PDF)
    const attachments = receiptPdfBuffer ? [
      {
        filename: `booking-ticket-${data.bookingId}.pdf`,
        data: receiptPdfBuffer,
        contentType: 'application/pdf',
      },
    ] : [];

    // The template is rendered once. Only the attachment list differs between
    // the primary attempt and the degraded retry, so the two can never present
    // different facts to the customer.
    const template = this.generateEmailTemplate('booking-confirmation', {
      ...data,
      verificationUrl,
      qrCodeCid: qrCodeBuffer ? 'booking-qr-code' : undefined,
    });

    try {
      await sendEmail({
        to: data.customerEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        type: 'booking-confirmation',
        fromName: this.fromName(data),
        inlineAttachments,
        attachments,
      });
      console.log(
        `Booking confirmation accepted booking=${data.bookingId} qr=${qrCodeBuffer ? 'yes' : 'no'} receipt=${receiptPdfBuffer ? 'yes' : 'no'}`,
      );
      return;
    } catch (error) {
      // Any other cause — a timeout that may have followed acceptance, a bad
      // address, a renderer fault — is re-thrown untouched. Retrying it could
      // put a SECOND confirmation in the customer's inbox for one booking.
      if (!isAttachmentRejection(error) || (!inlineAttachments.length && !attachments.length)) {
        throw error;
      }
      // The ticket itself is what we are about to drop, so this is recorded
      // loudly rather than swallowed: operations must be able to find the
      // bookings whose voucher never left the building.
      console.error(
        `Booking confirmation degraded booking=${data.bookingId} reason=attachment_rejected — the QR voucher and receipt PDF were NOT delivered and need a manual resend.`,
      );
    }

    // Degraded retry: the same message without its attachments, and without
    // the QR panel, so the email does not point at an image that is not there.
    const plainTemplate = this.generateEmailTemplate('booking-confirmation', {
      ...data,
      verificationUrl,
      qrCodeCid: undefined,
    });
    await sendEmail({
      to: data.customerEmail,
      subject: plainTemplate.subject,
      html: plainTemplate.html,
      text: plainTemplate.text,
      type: 'booking-confirmation-degraded',
      fromName: this.fromName(data),
    });
  }

  // PAYMENT CONFIRMATION
  static async sendPaymentConfirmation(data: PaymentEmailData): Promise<void> {
    await this.deliver('payment-confirmation', data, data.customerEmail);
  }

  // PAYMENT FAILED / ACTION NEEDED
  static async sendPaymentFailed(data: PaymentFailedEmailData): Promise<void> {
    await this.deliver('payment-failed', data, data.customerEmail);
  }

  // BANK TRANSFER INSTRUCTIONS
  static async sendBankTransferInstructions(data: BankTransferEmailData): Promise<void> {
    await this.deliver('bank-transfer-instructions', data, data.customerEmail);
  }

  // TRIP REMINDER (24H BEFORE)
  static async sendTripReminder(data: TripReminderData): Promise<void> {
    await this.deliver('trip-reminder', data, data.customerEmail);
  }

  // TRIP COMPLETION + REVIEW REQUEST
  static async sendTripCompletion(data: TripCompletionData): Promise<void> {
    await this.deliver('trip-completion', data, data.customerEmail);
  }

  // BOOKING CANCELLATION
  static async sendCancellationConfirmation(data: CancellationData): Promise<void> {
    await this.deliver('booking-cancellation', data, data.customerEmail);
  }

  // REFUND CONFIRMED BY THE PAYMENT PROVIDER
  static async sendRefundIssued(data: RefundIssuedEmailData): Promise<void> {
    await this.deliver('refund-issued', data, data.customerEmail);
  }

  // BOOKING STATUS UPDATE
  static async sendBookingStatusUpdate(data: BookingStatusUpdateData): Promise<void> {
    await this.deliver('booking-update', data, data.customerEmail);
  }

  // WELCOME EMAIL
  static async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    await this.deliver('welcome', data, data.customerEmail);
  }

  // PASSWORD CHANGED (security notice to the account's own address)
  static async sendPasswordChanged(data: PasswordChangedEmailData): Promise<void> {
    await this.deliver('password-changed', data, data.customerEmail);
  }

  // ENQUIRY ACKNOWLEDGEMENT (to the person who wrote in)
  static async sendEnquiryReceived(data: EnquiryReceivedEmailData): Promise<void> {
    await this.deliver('enquiry-received', data, data.customerEmail);
  }

  /**
   * The internal address for a brand's own operations mail.
   *
   * The platform inbox belongs to the platform. Falling back to it for a named
   * white-label brand does two wrong things at once: that brand's operator
   * never learns about their booking, and the platform's staff receive another
   * company's customer name, email, phone and pickup address. So a named brand
   * with no notification address of its own fails closed and says so.
   */
  private static internalRecipient(
    channel: string,
    data: { tenantId?: string; notificationEmail?: string },
    platformInbox: string | undefined,
  ): string | null {
    const named = Boolean(data.tenantId) && data.tenantId !== 'default';
    if (named) {
      if (isValidEmailAddress(data.notificationEmail)) return data.notificationEmail;
      console.error(
        `${channel} not sent: tenant "${data.tenantId}" has no notification address, and the platform inbox must not receive another brand's customer data.`,
      );
      return null;
    }
    if (isValidEmailAddress(platformInbox)) return platformInbox;
    console.warn(`${channel} not sent: no platform notification address is configured.`);
    return null;
  }

  // ADMIN BOOKING ALERT
  static async sendAdminBookingAlert(data: AdminAlertData): Promise<void> {
    const recipient = this.internalRecipient(
      'Admin booking alert',
      data,
      process.env.ADMIN_NOTIFICATION_EMAIL,
    );
    if (!recipient) return;

    await this.deliver('admin-booking-alert', data, recipient);
  }

  static async sendAdminInviteEmail(data: AdminInviteEmailData): Promise<void> {
    await this.deliver('admin-invite', data, data.inviteeEmail);
  }

  static async sendAdminAccessUpdateEmail(data: AdminAccessUpdateEmailData): Promise<void> {
    await this.deliver('admin-access-update', data, data.inviteeEmail);
  }

  // OPERATOR BOOKING UPDATE (sent when admin edits a booking)
  static async sendOperatorBookingUpdate(data: OperatorBookingUpdateData): Promise<void> {
    const recipient = this.internalRecipient(
      'Operator booking update',
      data,
      process.env.OPERATOR_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL,
    );
    if (!recipient) return;

    // Render the change time in Cairo local time instead of a raw UTC ISO
    // string — operators read this to know when the change actually happened.
    const changedAtDate = new Date(data.changedAt);
    const changedAt = Number.isNaN(changedAtDate.getTime())
      ? data.changedAt
      : `${changedAtDate.toLocaleString('en-US', {
          timeZone: 'Africa/Cairo',
          year: 'numeric', month: 'long', day: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true,
        })} (Cairo time)`;

    await this.deliver('operator-booking-update', { ...data, changedAt }, recipient);
  }

  /** Render and send one message. Every simple sender routes through here. */
  private static async deliver<T extends object>(
    type: EmailType,
    data: T,
    recipient: string | undefined,
  ): Promise<void> {
    if (!isValidEmailAddress(recipient)) throw new InvalidRecipientError('recipient');
    const template = this.generateEmailTemplate(type, data);
    await sendEmail({
      to: recipient,
      subject: template.subject,
      html: template.html,
      text: template.text,
      type,
      fromName: this.fromName(data as { companyName?: string }),
    });
  }
}
