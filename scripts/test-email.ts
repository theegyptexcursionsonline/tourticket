// scripts/test-email.ts
// Run with: npx tsx scripts/test-email.ts

import { EmailService } from '../lib/email/emailService';

const TEST_EMAIL = 'info@rdmi.in';

async function testEmails() {
  console.log('🚀 Starting email template tests...\n');

  // Test 1: Admin Booking Alert (with detailed tour information)
  console.log('📧 Test 1: Sending Admin Booking Alert...');
  try {
    await EmailService.sendAdminBookingAlert({
      customerName: 'John Smith',
      customerEmail: 'customer@example.com',
      customerPhone: '+1 (555) 123-4567',
      tourTitle: '2 Tours',
      bookingId: 'EEO-TEST-12345678',
      bookingDate: new Date().toLocaleDateString('en-US'),
      totalPrice: '$245.50',
      paymentMethod: 'card',
      specialRequests: 'Vegetarian meals preferred. Need wheelchair accessible transport.',
      adminDashboardLink: 'https://preview.egypt-excursionsonline.com/admin/bookings/EEO-TEST-12345678',
      baseUrl: 'https://preview.egypt-excursionsonline.com',
      tours: [
        {
          title: 'Pyramids of Giza Private Tour',
          date: 'Tue, Nov 19, 2025',
          time: '09:00 AM',
          adults: 2,
          children: 1,
          infants: 0,
          bookingOption: 'Private Tour with Guide',
          addOns: ['Hotel Pickup & Drop-off', 'Lunch at Local Restaurant', 'Camel Ride'],
          price: '$149.00'
        },
        {
          title: 'Nile River Dinner Cruise',
          date: 'Wed, Nov 20, 2025',
          time: '07:00 PM',
          adults: 2,
          children: 1,
          infants: 1,
          bookingOption: 'Premium Package',
          addOns: ['Private Table', 'Professional Photography'],
          price: '$96.50'
        }
      ]
    });
    console.log('✅ Admin Booking Alert sent successfully!\n');
  } catch (error) {
    console.error('❌ Failed to send Admin Booking Alert:', error);
  }

  // Test 2: Booking Confirmation
  console.log('📧 Test 2: Sending Booking Confirmation...');
  try {
    await EmailService.sendBookingConfirmation({
      customerName: 'John Smith',
      customerEmail: TEST_EMAIL,
      tourTitle: 'Pyramids of Giza Private Tour',
      bookingDate: 'Tuesday, November 19, 2025',
      bookingTime: '09:00 AM',
      participants: '3 participants',
      totalPrice: '$245.50',
      bookingId: 'EEO-TEST-12345678',
      specialRequests: 'Vegetarian meals preferred',
      meetingPoint: 'Hotel Lobby - Four Seasons Cairo',
      contactNumber: '+20 11 42255624',
      tourImage: 'https://preview.egypt-excursionsonline.com/pyramid.png',
      baseUrl: 'https://preview.egypt-excursionsonline.com'
    });
    console.log('✅ Booking Confirmation sent successfully!\n');
  } catch (error) {
    console.error('❌ Failed to send Booking Confirmation:', error);
  }

  // Test 3: Payment Confirmation
  console.log('📧 Test 3: Sending Payment Confirmation...');
  try {
    await EmailService.sendPaymentConfirmation({
      customerName: 'John Smith',
      customerEmail: TEST_EMAIL,
      paymentId: 'pi_test_1234567890',
      paymentMethod: 'Visa ending in 4242',
      amount: '$245.50',
      currency: 'USD',
      bookingId: 'EEO-TEST-12345678',
      tourTitle: 'Pyramids of Giza Private Tour',
      baseUrl: 'https://preview.egypt-excursionsonline.com'
    });
    console.log('✅ Payment Confirmation sent successfully!\n');
  } catch (error) {
    console.error('❌ Failed to send Payment Confirmation:', error);
  }

  // Test 4: Trip Reminder
  console.log('📧 Test 4: Sending Trip Reminder...');
  try {
    await EmailService.sendTripReminder({
      customerName: 'John Smith',
      customerEmail: TEST_EMAIL,
      tourTitle: 'Pyramids of Giza Private Tour',
      bookingDate: 'Tomorrow',
      bookingTime: '09:00 AM',
      meetingPoint: 'Hotel Lobby - Four Seasons Cairo',
      contactNumber: '+20 11 42255624',
      weatherInfo: 'Sunny, 28°C (82°F)',
      whatToBring: [
        'Comfortable walking shoes',
        'Sunscreen and hat',
        'Camera',
        'Water bottle',
        'Valid ID or passport'
      ],
      importantNotes: 'Please arrive 15 minutes early. Our guide will be wearing a blue Egypt Excursions Online shirt.',
      bookingId: 'EEO-TEST-12345678',
      baseUrl: 'https://preview.egypt-excursionsonline.com'
    });
    console.log('✅ Trip Reminder sent successfully!\n');
  } catch (error) {
    console.error('❌ Failed to send Trip Reminder:', error);
  }

  // Test 5: Welcome Email
  console.log('📧 Test 5: Sending Welcome Email...');
  try {
    await EmailService.sendWelcomeEmail({
      customerName: 'John Smith',
      customerEmail: TEST_EMAIL,
      dashboardLink: 'https://preview.egypt-excursionsonline.com/user/dashboard',
      recommendedTours: [
        {
          title: 'Pyramids of Giza Tour',
          image: 'https://preview.egypt-excursionsonline.com/pyramid.png',
          price: '$49',
          link: 'https://preview.egypt-excursionsonline.com/tour/pyramids-giza'
        },
        {
          title: 'Nile River Cruise',
          image: 'https://preview.egypt-excursionsonline.com/pyramid.png',
          price: '$89',
          link: 'https://preview.egypt-excursionsonline.com/tour/nile-cruise'
        }
      ],
      baseUrl: 'https://preview.egypt-excursionsonline.com'
    });
    console.log('✅ Welcome Email sent successfully!\n');
  } catch (error) {
    console.error('❌ Failed to send Welcome Email:', error);
  }

  console.log('🎉 All email tests completed!');
  console.log(`📬 Check your inbox at: ${TEST_EMAIL}\n`);
}

// Run the tests
testEmails()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
