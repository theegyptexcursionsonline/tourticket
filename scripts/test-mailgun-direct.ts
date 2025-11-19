import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import after loading env
import { sendEmail } from '../lib/mailgun';

async function testMailgunDirect() {
  console.log('🧪 Testing Mailgun direct email to info@rdmi.in...\n');

  console.log('Configuration:');
  console.log('- Mailgun Domain:', process.env.MAILGUN_DOMAIN);
  console.log('- From Email:', process.env.MAILGUN_FROM_EMAIL);
  console.log('- Admin Email:', process.env.ADMIN_NOTIFICATION_EMAIL);
  console.log('- API Key present:', !!process.env.MAILGUN_API_KEY);
  console.log('');

  try {
    await sendEmail({
      to: 'info@rdmi.in',
      subject: '🧪 Test Email - Mailgun Direct Test',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #2563eb;">Mailgun Direct Test</h1>
            <p>This is a direct test email sent via Mailgun to verify email delivery.</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>Domain: ${process.env.MAILGUN_DOMAIN}</li>
              <li>From: ${process.env.MAILGUN_FROM_EMAIL}</li>
              <li>To: info@rdmi.in</li>
            </ul>
            <p style="color: green;"><strong>✅ If you see this, Mailgun is working correctly!</strong></p>
          </body>
        </html>
      `,
      type: 'test'
    });

    console.log('✅ Email sent successfully to info@rdmi.in');
    console.log('📬 Check your inbox (and spam folder) at info@rdmi.in');
    console.log('');
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Failed to send email:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

testMailgunDirect();
