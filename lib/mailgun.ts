// lib/mailgun.ts
import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

const DOMAIN = process.env.MAILGUN_DOMAIN || '';
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || 'noreply@yourdomain.com';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@egyptexcursions.com';

// --- INTERFACES ---

export interface BookingConfirmationData {
  customerName: string;
  customerEmail: string;
  tourTitle: string;
  bookingDate: string;
  bookingTime: string;
  participants: string;
  totalPrice: string;
  bookingId: string;
  specialRequests?: string;
}

export interface ContactFormData {
    name: string;
    fromEmail: string;
    message: string;
}

// --- EMAIL FUNCTIONS ---

/**
 * Sends a contact form submission to the admin email.
 */
export async function sendContactFormEmail(data: ContactFormData) {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>New Contact Form Submission</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                .header { background: #4a5568; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; }
                .field { margin-bottom: 15px; }
                .label { font-weight: bold; color: #2d3748; }
                .message-box { background: #f7fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Message from your Website</h1>
                </div>
                <div class="content">
                    <div class="field">
                        <p class="label">From:</p>
                        <p>${data.name}</p>
                    </div>
                    <div class="field">
                        <p class="label">Email:</p>
                        <p><a href="mailto:${data.fromEmail}">${data.fromEmail}</a></p>
                    </div>
                    <div class="field">
                        <p class="label">Message:</p>
                        <div class="message-box">${data.message}</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        await mg.messages.create(DOMAIN, {
            from: `Website Contact Form <${FROM_EMAIL}>`,
            to: [ADMIN_EMAIL],
            subject: `New Contact Message from ${data.name}`,
            html: htmlContent,
            'h:Reply-To': data.fromEmail
        });
        console.log('Contact form email sent successfully');
    } catch (error) {
        console.error('Failed to send contact form email:', error);
        throw new Error('Could not send the contact email.');
    }
}

/**
 * Sends a booking confirmation email to the customer.
 */
export async function sendBookingConfirmation(data: BookingConfirmationData) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #6b7280; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .cta-button { background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Booking Confirmed!</h1>
                <p>Your adventure awaits</p>
            </div>
            <div class="content">
                <p>Dear ${data.customerName},</p>
                <p>Thank you for booking with Egypt Excursions Online! We're excited to have you join us for an amazing experience.</p>
                <div class="booking-details">
                    <h3>📋 Booking Details</h3>
                    <div class="detail-row"><span class="label">Booking ID:</span><span class="value">${data.bookingId}</span></div>
                    <div class="detail-row"><span class="label">Tour:</span><span class="value">${data.tourTitle}</span></div>
                    <div class="detail-row"><span class="label">Date & Time:</span><span class="value">${data.bookingDate} at ${data.bookingTime}</span></div>
                    <div class="detail-row"><span class="label">Participants:</span><span class="value">${data.participants}</span></div>
                    <div class="detail-row"><span class="label">Total Price:</span><span class="value">${data.totalPrice}</span></div>
                    ${data.specialRequests ? `<div class="detail-row"><span class="label">Special Requests:</span><span class="value">${data.specialRequests}</span></div>` : ''}
                </div>
                <div style="text-align: center;"><a href="mailto:support@egyptexcursions.com" class="cta-button">Contact Support</a></div>
                <p>We look forward to providing you with an unforgettable experience!</p>
                <p>Best regards,<br>The Egypt Excursions Online Team</p>
            </div>
            <div class="footer">
                <p>Egypt Excursions Online | 123 Nile Street, Cairo, Egypt</p>
            </div>
        </div>
    </body>
    </html>
  `;
  try {
    await mg.messages.create(DOMAIN, {
      from: `Egypt Excursions Online <${FROM_EMAIL}>`,
      to: [data.customerEmail],
      subject: `Booking Confirmation - ${data.tourTitle}`,
      html: htmlContent,
    });
    console.log('Booking confirmation email sent successfully');
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    throw new Error('Failed to send booking confirmation email');
  }
}

/**
 * Sends a new booking notification to the admin.
 */
export async function sendBookingNotificationToAdmin(data: BookingConfirmationData) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>New Booking Notification</title>
    </head>
    <body>
        <h1>🎯 New Booking Alert</h1>
        <p>A new booking has been confirmed:</p>
        <div>
            <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
            <p><strong>Tour:</strong> ${data.tourTitle}</p>
            <p><strong>Booking ID:</strong> ${data.bookingId}</p>
        </div>
    </body>
    </html>
  `;
  try {
    await mg.messages.create(DOMAIN, {
      from: `Egypt Excursions System <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: `New Booking: ${data.tourTitle} - ${data.customerName}`,
      html: htmlContent,
    });
    console.log('Admin notification sent successfully');
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}

/**
 * Sends a password reset email to the user.
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Password Reset Request</title>
    </head>
    <body>
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password. This link will expire in 15 minutes.</p>
        <a href="${resetUrl}">Reset Your Password</a>
        <p>If you did not request a password reset, please ignore this email.</p>
    </body>
    </html>
  `;
  try {
    await mg.messages.create(DOMAIN, {
      from: `Egypt Excursions Online <${FROM_EMAIL}>`,
      to: [email],
      subject: 'Your Password Reset Link',
      html: htmlContent,
    });
    console.log('Password reset email sent successfully');
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}