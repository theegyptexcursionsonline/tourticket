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
                    <div class="detail-row">
                        <span class="label">Booking ID:</span>
                        <span class="value">${data.bookingId}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Tour:</span>
                        <span class="value">${data.tourTitle}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Date & Time:</span>
                        <span class="value">${data.bookingDate} at ${data.bookingTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Participants:</span>
                        <span class="value">${data.participants}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Total Price:</span>
                        <span class="value">${data.totalPrice}</span>
                    </div>
                    ${data.specialRequests ? `
                    <div class="detail-row">
                        <span class="label">Special Requests:</span>
                        <span class="value">${data.specialRequests}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>📍 Important Information</h3>
                    <ul>
                        <li>Please arrive 15 minutes before your scheduled time</li>
                        <li>Bring a valid ID and comfortable walking shoes</li>
                        <li>Check weather conditions before your visit</li>
                        <li>Contact us if you need to make any changes</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <a href="mailto:support@egyptexcursions.com" class="cta-button">Contact Support</a>
                </div>
                
                <p>We look forward to providing you with an unforgettable experience!</p>
                <p>Best regards,<br>The Egypt Excursions Online Team</p>
            </div>
            
            <div class="footer">
                <p>Egypt Excursions Online | 123 Nile Street, Cairo, Egypt</p>
                <p>Questions? Reply to this email or contact us at support@egyptexcursions.com</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
Booking Confirmation - Egypt Excursions Online

Dear ${data.customerName},

Thank you for booking with us! Here are your booking details:

Booking ID: ${data.bookingId}
Tour: ${data.tourTitle}
Date & Time: ${data.bookingDate} at ${data.bookingTime}
Participants: ${data.participants}
Total Price: ${data.totalPrice}
${data.specialRequests ? `Special Requests: ${data.specialRequests}` : ''}

Important Information:
- Please arrive 15 minutes before your scheduled time
- Bring a valid ID and comfortable walking shoes
- Check weather conditions before your visit
- Contact us if you need to make any changes

We look forward to providing you with an unforgettable experience!

Best regards,
The Egypt Excursions Online Team
  `;

  try {
    const result = await mg.messages.create(DOMAIN, {
      from: `Egypt Excursions Online <${FROM_EMAIL}>`,
      to: [data.customerEmail],
      subject: `Booking Confirmation - ${data.tourTitle}`,
      text: textContent,
      html: htmlContent,
    });

    console.log('Email sent successfully:', result);
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send booking confirmation email');
  }
}

export async function sendBookingNotificationToAdmin(data: BookingConfirmationData) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@egyptexcursions.com';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Booking Notification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .booking-details { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 New Booking Alert</h1>
            </div>
            <div class="content">
                <p>A new booking has been confirmed:</p>
                <div class="booking-details">
                    <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
                    <p><strong>Tour:</strong> ${data.tourTitle}</p>
                    <p><strong>Date & Time:</strong> ${data.bookingDate} at ${data.bookingTime}</p>
                    <p><strong>Participants:</strong> ${data.participants}</p>
                    <p><strong>Total Price:</strong> ${data.totalPrice}</p>
                    <p><strong>Booking ID:</strong> ${data.bookingId}</p>
                    ${data.specialRequests ? `<p><strong>Special Requests:</strong> ${data.specialRequests}</p>` : ''}
                </div>
                <p>Please review and prepare for this booking.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  try {
    await mg.messages.create(DOMAIN, {
      from: `Egypt Excursions System <${FROM_EMAIL}>`,
      to: [adminEmail],
      subject: `New Booking: ${data.tourTitle} - ${data.customerName}`,
      html: htmlContent,
    });

    console.log('Admin notification sent successfully');
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    // Don't throw error for admin notification failures
  }
}

// --- ADD THIS FUNCTION ---
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Password Reset Request</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .cta-button { background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>You are receiving this email because a password reset request was made for your account.</p>
                <p>Click the link below to reset your password. This link will expire in 15 minutes.</p>
                <a href="${resetUrl}" class="cta-button">Reset Your Password</a>
                <p>If you did not request a password reset, please ignore this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  try {
    const result = await mg.messages.create(DOMAIN, {
      from: `Egypt Excursions Online <${FROM_EMAIL}>`,
      to: [email],
      subject: 'Your Password Reset Link for Egypt Excursions Online',
      html: htmlContent,
    });
    console.log('Password reset email sent:', result);
    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}