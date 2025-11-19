# Email Template Testing

This directory contains scripts to test email templates by sending sample emails to your inbox.

## Prerequisites

Make sure you have the following environment variables configured in your `.env` file:

```env
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="booking.egypt-excursionsonline.com"
MAILGUN_FROM_EMAIL="info@egypt-excursionsonline.com"
ADMIN_NOTIFICATION_EMAIL="info@rdmi.in"
```

## Available Test Scripts

### 1. Test All Email Templates
Tests all email types including booking confirmation, payment confirmation, trip reminder, welcome email, etc.

```bash
npx tsx scripts/test-email.ts
```

**What it tests:**
- ✅ Admin Booking Alert (with detailed tour information)
- ✅ Booking Confirmation
- ✅ Payment Confirmation
- ✅ Trip Reminder
- ✅ Welcome Email

---

### 2. Test Admin Booking Alert Only
Quick test focused on the admin booking alert with the new detailed tour breakdown.

```bash
npx tsx scripts/test-admin-email.ts
```

**What it includes:**
- ✅ Logo (now loading correctly with absolute URL)
- ✅ Customer phone number
- ✅ Detailed breakdown of each tour
- ✅ Booking options selected
- ✅ Number of adults/children/infants
- ✅ Add-ons for each tour
- ✅ Individual tour prices
- ✅ Special requests

---

## Recent Improvements

### Logo Loading Fixed ✅
All email templates now use absolute URLs for the logo:
```
https://egypt-excursionsonline.com/EEO-logo.png
```

### Admin Email Enhanced ✅
The admin booking alert now includes comprehensive tour details:
- Individual tour breakdown instead of just "2 Tours"
- Selected booking options (e.g., "Private Tour", "Group Tour")
- Participant counts (adults, children, infants)
- Add-ons selected for each tour
- Individual pricing for each tour
- Customer phone number

---

## Customizing Test Data

To modify the test data, edit the respective script files:
- `test-email.ts` - Full email test suite
- `test-admin-email.ts` - Admin alert only

Look for the `TEST_EMAIL` constant at the top of each file to change the recipient email address.

---

## Troubleshooting

### Email not received?
1. Check your Mailgun dashboard for delivery status
2. Verify your Mailgun API key is correct
3. Check spam/junk folder
4. Ensure your domain is verified in Mailgun

### Script errors?
1. Make sure all environment variables are set
2. Run `npm install` or `pnpm install` to ensure dependencies are installed
3. Check that the email service is properly configured

---

## Testing in Production

Before deploying to production:

1. Run both test scripts locally
2. Verify emails look correct on:
   - Desktop email clients
   - Mobile email apps
   - Webmail (Gmail, Outlook, etc.)
3. Check that logo loads correctly
4. Verify all tour details are displayed properly

---

## Notes

- Test emails are sent to `booking@egypt-excursionsonline.com` by default
- Logo URL is hardcoded to production domain: `egypt-excursionsonline.com`
- Scripts use sample booking data that represents typical use cases
- All prices and booking IDs in test emails are fake/sample data
