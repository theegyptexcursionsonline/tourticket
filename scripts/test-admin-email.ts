// scripts/test-admin-email.ts
// Quick test for Admin Booking Alert with detailed tour information
// Run with: npx tsx scripts/test-admin-email.ts

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Override admin email for testing
process.env.ADMIN_NOTIFICATION_EMAIL = 'info@rdmi.in';

import { EmailService } from '../lib/email/emailService';

const TEST_EMAIL = 'info@rdmi.in';

async function testAdminEmail() {
  console.log('🚀 Testing Admin Booking Alert with detailed tour information...\n');

  try {
    await EmailService.sendAdminBookingAlert({
      customerName: 'Fouad Fouad',
      customerEmail: 'egypt.excursionsonline@gmail.com',
      customerPhone: '+20 11 42255624',
      tourTitle: '2 Tours',
      bookingId: 'MULTI-1763493312278',
      bookingDate: '11/19/2025',
      totalPrice: '$2.16',
      paymentMethod: 'card',
      specialRequests: 'Please arrange early morning pickup. Need vegetarian meal options.',
      adminDashboardLink: 'https://egypt-excursionsonline.com/admin/bookings/MULTI-1763493312278',
      baseUrl: 'https://egypt-excursionsonline.com',
      tours: [
        {
          title: 'Half-Day Pyramids Tour',
          date: 'Tue, Nov 19, 2025',
          time: '09:00 AM',
          adults: 2,
          children: 0,
          infants: 0,
          bookingOption: 'Private Tour with Egyptologist Guide',
          addOns: ['Hotel Pickup & Drop-off', 'Entrance Tickets', 'Bottled Water'],
          price: '$1.08'
        },
        {
          title: 'Egyptian Museum Visit',
          date: 'Tue, Nov 19, 2025',
          time: '02:00 PM',
          adults: 2,
          children: 0,
          infants: 0,
          bookingOption: 'Standard Group Tour',
          addOns: ['Audio Guide', 'Fast Track Entry'],
          price: '$1.08'
        }
      ]
    });

    console.log('✅ Admin Booking Alert sent successfully!');
    console.log(`📬 Check your inbox at: ${TEST_EMAIL}`);
    console.log('\n📋 Email should include:');
    console.log('  ✓ Logo (now loading correctly)');
    console.log('  ✓ Customer phone number');
    console.log('  ✓ Detailed breakdown of each tour');
    console.log('  ✓ Booking options selected');
    console.log('  ✓ Number of adults/children/infants');
    console.log('  ✓ Add-ons for each tour');
    console.log('  ✓ Individual tour prices');
    console.log('  ✓ Special requests (if any)\n');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    process.exit(1);
  }
}

// Run the test
testAdminEmail()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
