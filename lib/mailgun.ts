// lib/mailgun.ts
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import type { MailgunMessageData } from 'mailgun.js/definitions';
import { renderEmailTemplate } from './email/render';

// Lazy initialization to avoid build-time errors when env vars are not set
let mgClient: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;

function getMailgunClient() {
  if (!mgClient) {
    const key = process.env.MAILGUN_API_KEY;
    if (!key) {
      throw new Error('MAILGUN_API_KEY environment variable is not set');
    }
    const mailgun = new Mailgun(formData);
    mgClient = mailgun.client({
      username: 'api',
      key: key,
    });
  }
  return mgClient;
}

const getDomain = () => process.env.MAILGUN_DOMAIN || '';
const getFromEmail = () => process.env.MAILGUN_FROM_EMAIL || 'booking@egypt-excursionsonline.com';

interface InlineAttachment {
  filename: string;
  data: Buffer;
  cid: string;
}

interface Attachment {
  filename: string;
  data: Buffer;
  contentType?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  /** The plain-text alternative. Every message the product sends has one. */
  text: string;
  type: string;
  /**
   * Sender display name. White-label brands send under their own name; the
   * envelope address stays the verified Mailgun sender either way.
   */
  fromName?: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  inlineAttachments?: InlineAttachment[];
  attachments?: Attachment[];
}

/** Deliberately strict: an address we cannot parse is never worth an attempt. */
const EMAIL_PATTERN = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;

export class InvalidRecipientError extends Error {
  constructor(readonly field: string) {
    super(`Email not sent: the ${field} address is missing or malformed.`);
    this.name = 'InvalidRecipientError';
  }
}

export function isValidEmailAddress(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_PATTERN.test(value.trim());
}

/**
 * A display name goes into a header, so a newline in it would let a caller
 * inject headers of their own. Strip anything that could break the line.
 */
function sanitizeDisplayName(value: string | undefined, fallback: string): string {
  const cleaned = String(value ?? '').replace(/[\r\n<>"]/g, ' ').trim().slice(0, 78);
  return cleaned || fallback;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // Validated before the client is built: a bad address must fail the same way
  // whether or not the provider happens to be configured.
  if (!isValidEmailAddress(options.to)) throw new InvalidRecipientError('recipient');
  if (options.cc && !isValidEmailAddress(options.cc)) throw new InvalidRecipientError('cc');
  if (options.bcc && !isValidEmailAddress(options.bcc)) throw new InvalidRecipientError('bcc');
  if (options.replyTo && !isValidEmailAddress(options.replyTo)) throw new InvalidRecipientError('reply-to');

  try {
    const mg = getMailgunClient();
    const DOMAIN = getDomain();
    const FROM_EMAIL = getFromEmail();
    const fromName = sanitizeDisplayName(options.fromName, 'Egypt Excursions Online');

    const messageData: MailgunMessageData = {
      from: `${fromName} <${FROM_EMAIL}>`,
      to: [options.to.trim()],
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(options.cc && { cc: [options.cc.trim()] }),
      ...(options.bcc && { bcc: [options.bcc.trim()] }),
      ...(options.replyTo && { 'h:Reply-To': options.replyTo.trim() }),
      'h:X-Mailgun-Tag': options.type, // For analytics
    };

    // Add inline attachments if present (for embedded images like QR codes)
    if (options.inlineAttachments && options.inlineAttachments.length > 0) {
      // Mailgun expects inline attachments with filename matching the CID
      messageData.inline = options.inlineAttachments.map(attachment => {
        console.log(`📎 Adding inline attachment: ${attachment.cid}, size: ${attachment.data.length} bytes`);
        // The filename should match the CID for proper embedding
        return {
          filename: attachment.cid, // Use CID as filename for Mailgun inline images
          data: attachment.data,
          knownLength: attachment.data.length
        };
      });
    }

    // Add regular attachments if present (for PDFs, etc.)
    if (options.attachments && options.attachments.length > 0) {
      messageData.attachment = options.attachments.map(attachment => {
        console.log(`📄 Adding attachment: ${attachment.filename}, size: ${attachment.data.length} bytes`);
        return {
          filename: attachment.filename,
          data: attachment.data,
          knownLength: attachment.data.length,
          contentType: attachment.contentType || 'application/octet-stream'
        };
      });
    }

    const inlineCount = Array.isArray(messageData.inline) ? messageData.inline.length : messageData.inline ? 1 : 0;
    const attachmentCount = Array.isArray(messageData.attachment) ? messageData.attachment.length : messageData.attachment ? 1 : 0;
    console.log(`Sending email type=${options.type} inline=${inlineCount} attachments=${attachmentCount}`);
    const result = await mg.messages.create(DOMAIN, messageData);
    console.log(`Email accepted type=${options.type} providerId=${result.id || 'unavailable'}`);
  } catch (error) {
    const safeCode = typeof error === 'object' && error !== null && 'status' in error
      ? String((error as { status?: unknown }).status || 'unknown')
      : 'unknown';
    console.error(`Email failed type=${options.type} status=${safeCode}`);
    throw error;
  }
}

interface ContactFormData {
  name: string;
  fromEmail: string;
  message?: string;
  /** Printed on both the internal copy and the sender's acknowledgement. */
  reference?: string;
  [key: string]: unknown;
}

/**
 * The internal copy of a website enquiry.
 *
 * The destination is an operations inbox configured in the environment. It is
 * checked explicitly rather than asserted with `!`, because an unset variable
 * previously produced a send to the literal string "undefined".
 */
export async function sendContactFormEmail(data: ContactFormData) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!isValidEmailAddress(adminEmail)) {
    throw new InvalidRecipientError('ADMIN_NOTIFICATION_EMAIL');
  }
  if (!isValidEmailAddress(data.fromEmail)) {
    throw new InvalidRecipientError('sender');
  }

  const reference = data.reference ? ` [${data.reference}]` : '';
  await sendEmail({
    to: adminEmail,
    subject: `New Contact Message from ${data.name}${reference}`,
    html: generateContactFormHTML(data),
    text: generateContactFormText(data),
    type: 'contact-form',
    replyTo: data.fromEmail,
  });
}

/**
 * Account recovery. Rendered through the shared layout like every other
 * message, so a reset link is no longer the one email with no plain-text part,
 * no dark mode and no Outlook-safe button.
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!isValidEmailAddress(email)) throw new InvalidRecipientError('recipient');

  const template = renderEmailTemplate('password-reset', {
    customerEmail: email,
    resetUrl,
    expiresInMinutes: 15,
  });
  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    type: 'password-reset',
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateContactFormHTML(data: ContactFormData): string {
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.fromEmail);
  const safeMessage = escapeHtml(data.message).replace(/\r?\n/g, '<br>');
  const safeReference = data.reference ? escapeHtml(data.reference) : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Contact Form Submission</h2>
      ${safeReference ? `<p><strong>Reference:</strong> ${safeReference}</p>` : ''}
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Message:</strong></p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
        ${safeMessage}
      </div>
    </div>
  `;
}

function generateContactFormText(data: ContactFormData): string {
  return [
    'New Contact Form Submission',
    data.reference ? `Reference: ${data.reference}` : '',
    `Name: ${data.name}`,
    `Email: ${data.fromEmail}`,
    '',
    'Message:',
    String(data.message ?? ''),
  ].filter((line) => line !== '').join('\n');
}
