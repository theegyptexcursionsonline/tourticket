// lib/mailgun.ts (Final Clean Version)
import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

const DOMAIN = process.env.MAILGUN_DOMAIN || '';
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || 'noreply@egyptexcursions.com';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  type: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await mg.messages.create(DOMAIN, {
      from: `Egypt Excursions Online <${FROM_EMAIL}>`,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.cc && { cc: [options.cc] }),
      ...(options.bcc && { bcc: [options.bcc] }),
      ...(options.replyTo && { 'h:Reply-To': options.replyTo }),
      'h:X-Mailgun-Tag': options.type, // For analytics
    });
    
    console.log(`✅ Email sent successfully: ${options.type} to ${options.to}`);
  } catch (error) {
    console.error(`❌ Failed to send email: ${options.type}`, error);
    throw error;
  }
}

// Legacy functions for contact form and password reset
interface ContactFormData {
  name: string;
  fromEmail: string;
  message?: string;
  [key: string]: unknown;
}

export async function sendContactFormEmail(data: ContactFormData) {
  await sendEmail({
    to: process.env.ADMIN_NOTIFICATION_EMAIL!,
    subject: `New Contact Message from ${data.name}`,
    html: generateContactFormHTML(data),
    type: 'contact-form',
    replyTo: data.fromEmail
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: generatePasswordResetHTML(resetUrl),
    type: 'password-reset'
  });
}

function generateContactFormHTML(data: ContactFormData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.fromEmail}</p>
      <p><strong>Message:</strong></p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
        ${data.message.replace(/\n/g, '<br>')}
      </div>
    </div>
  `;
}

function generatePasswordResetHTML(resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Reset Password
      </a>
      <p>This link will expire in 15 minutes.</p>
    </div>
  `;
}