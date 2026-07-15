// scripts/test-all-emails.ts
// Sends ONE test email of EVERY EmailService type to the internal ops mailbox
// so the full notification surface can be verified end-to-end via Mailgun.
// Run with production Mailgun env piped in:
//   MAILGUN_API_KEY=... MAILGUN_DOMAIN=... npx tsx scripts/test-all-emails.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

// RDMI test inbox — NEVER a customer address or the client ops mailbox.
const TEST_EMAIL = 'rdmitechventurespvtltd@gmail.com';
// Admin/operator emails must land in the same internal test inbox.
process.env.ADMIN_NOTIFICATION_EMAIL = TEST_EMAIL;
process.env.OPERATOR_NOTIFICATION_EMAIL = TEST_EMAIL;

const BASE = 'https://egypt-excursionsonline.com';
const results: Array<{ type: string; ok: boolean; error?: string }> = [];

async function run(type: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ type, ok: true });
    console.log(`✅ ${type}`);
  } catch (error) {
    results.push({ type, ok: false, error: (error as Error).message?.slice(0, 200) });
    console.error(`❌ ${type}:`, (error as Error).message);
  }
}

async function main() {
  const { EmailService } = await import('../lib/email/emailService');
  const common = {
    customerName: 'Mail Test',
    customerEmail: TEST_EMAIL,
    tourTitle: 'MAIL-TEST Pyramids of Giza Private Tour',
    bookingId: 'EEO-MAILTEST-01',
    bookingDate: 'Tuesday, November 19, 2026',
    bookingTime: '09:00 AM',
    baseUrl: BASE,
  };

  await run('booking-confirmation', () => EmailService.sendBookingConfirmation({
    ...common,
    bookingOption: 'Private Tour with Guide',
    participants: '2 participants',
    participantBreakdown: '2 x Adults ($67.20)',
    totalPrice: '$134.40',
    meetingPoint: 'Hotel Lobby',
    contactNumber: '+20 11 42255624',
    tourImage: `${BASE}/pyramid.png`,
  }));

  await run('payment-confirmation', () => EmailService.sendPaymentConfirmation({
    ...common,
    paymentId: 'pi_mailtest_0001',
    paymentMethod: 'Visa ending in 4242',
    amount: '$134.40',
    currency: 'USD',
  }));

  await run('bank-transfer-instructions', () => EmailService.sendBankTransferInstructions({
    ...common,
    participants: '2 participants',
    totalPrice: '$134.40',
    bankName: 'Test Bank',
    accountName: 'Egypt Excursions Online',
    accountNumber: '0000000000',
    iban: 'EG000000000000000000000000000',
    swiftCode: 'TESTEGCX',
    currency: 'USD',
  } as any));

  await run('trip-reminder', () => EmailService.sendTripReminder({
    ...common,
    meetingPoint: 'Hotel Lobby',
    contactNumber: '+20 11 42255624',
    weatherInfo: 'Sunny, 28°C',
    whatToBring: ['Water', 'Hat'],
    importantNotes: 'This is a MAIL-TEST message.',
  }));

  await run('trip-completion', () => EmailService.sendTripCompletion({
    ...common,
    reviewLink: `${BASE}/tour/mail-test#reviews`,
  } as any));

  await run('booking-cancellation', () => EmailService.sendCancellationConfirmation({
    ...common,
    refundAmount: '$134.40',
    refundProcessingDays: 5,
    cancellationReason: 'MAIL-TEST cancellation',
  }));

  await run('booking-update', () => EmailService.sendBookingStatusUpdate({
    ...common,
    newStatus: 'Confirmed',
    statusMessage: 'MAIL-TEST status update.',
  }));

  await run('welcome', () => EmailService.sendWelcomeEmail({
    customerName: 'Mail Test',
    customerEmail: TEST_EMAIL,
    dashboardLink: `${BASE}/user/dashboard`,
    baseUrl: BASE,
  }));

  await run('admin-booking-alert', () => EmailService.sendAdminBookingAlert({
    ...common,
    customerPhone: '+20 100 000 0000',
    totalPrice: '$134.40',
    paymentMethod: 'card',
    adminDashboardLink: `${BASE}/admin/bookings/EEO-MAILTEST-01`,
    tours: [{
      title: 'MAIL-TEST Pyramids of Giza Private Tour',
      date: 'Tue, Nov 19, 2026',
      time: '09:00 AM',
      adults: 2, children: 0, infants: 0,
      bookingOption: 'Private Tour with Guide',
      addOns: [],
      price: '$134.40',
    }],
  } as any));

  await run('admin-invite', () => EmailService.sendAdminInviteEmail({
    inviteeName: 'Mail Test',
    inviteeEmail: TEST_EMAIL,
    inviterName: 'System Test',
    temporaryPassword: 'placeholder-not-real',
    role: 'support',
    permissions: ['manageBookings'],
    portalLink: `${BASE}/admin`,
  } as any));

  await run('admin-access-update', () => EmailService.sendAdminAccessUpdateEmail({
    inviteeName: 'Mail Test',
    inviteeEmail: TEST_EMAIL,
    updatedBy: 'System Test',
    action: 'permissions_updated',
    portalLink: `${BASE}/admin`,
  } as any));

  await run('operator-booking-update', () => EmailService.sendOperatorBookingUpdate({
    ...common,
    customerPhone: '+20 100 000 0000',
    changesSummary: 'MAIL-TEST: status changed from Pending to Confirmed.',
    changedBy: 'mail-test@internal',
    changedAt: new Date().toISOString(),
    newStatus: 'Confirmed',
  } as any));

  const failed = results.filter(r => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} accepted by Mailgun ===`);
  if (failed.length) console.log('FAILED:', JSON.stringify(failed, null, 1));
  process.exit(failed.length ? 2 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
