# QR Code Feature for Booking Confirmations

## Overview
This feature automatically generates a unique QR code for each booking confirmation email. When scanned, the QR code takes customers to a secure, public page displaying their booking details.

## How It Works

### 1. **QR Code Generation**
When a booking confirmation email is sent:
- A unique verification URL is generated using the booking reference
- A QR code is created that encodes this URL
- The QR code is embedded directly in the confirmation email

### 2. **Booking Verification Page**
When the QR code is scanned:
- Customer is taken to `/booking/verify/[reference]`
- The page fetches and displays booking details securely
- No authentication required (public access)
- Shows comprehensive booking information

## Implementation Details

### Files Created/Modified

#### **New Files:**
1. `lib/utils/qrcode.ts` - QR code generation utilities
2. `app/booking/verify/[reference]/page.tsx` - Public booking verification page
3. `app/api/booking/verify/[reference]/route.ts` - API endpoint to fetch booking details

#### **Modified Files:**
1. `lib/email/emailService.ts` - Added QR code generation to booking confirmation flow
2. `lib/email/type.ts` - Extended BookingEmailData interface with QR code fields
3. `lib/email/templates/booking-confirmation.html` - Added QR code display section

### Key Functions

#### `generateQRCode(text, options)`
```typescript
// Generates QR code as base64 data URL
const qrCodeDataUrl = await generateQRCode(url, {
  width: 300,
  margin: 2,
});
```

#### `generateBookingVerificationURL(bookingReference)`
```typescript
// Creates verification URL: https://yoursite.com/booking/verify/EEO-12345678-ABC123
const verificationUrl = generateBookingVerificationURL(booking.bookingReference);
```

## Email Template Integration

The QR code appears in the booking confirmation email within the "Digital Ticket Card" section:

```html
<!-- QR Code Section -->
{{#if qrCodeDataUrl}}
<div style="border-top: 1px dashed #d1d5db; padding-top: 24px; margin-top: 24px; text-align: center;">
    <div style="font-size: 13px; font-weight: 700; color: #6b7280; margin-bottom: 16px;">Your Digital Pass</div>
    <img src="{{qrCodeDataUrl}}" alt="Booking QR Code" style="...">
    <p style="...">
        Scan this QR code at the meeting point or 
        <a href="{{verificationUrl}}">view your booking online</a>
    </p>
</div>
{{/if}}
```

## Booking Verification Page Features

### What's Displayed:
- ✅ Booking status badge (Confirmed/Pending/Cancelled)
- 📋 Booking reference number
- 📅 Date and time
- 👥 Guest breakdown (adults, children, infants)
- 💰 Total price
- 🎫 Selected booking option
- 📝 Special requests
- 🚨 Emergency contact
- 📧 Guest information
- 🆘 Support contact options (Email & WhatsApp)

### Security Considerations:
- Public access (no auth required) - convenient for staff verification
- Only displays necessary booking information
- Sensitive data (payment details) is not shown
- Booking reference must be exact match

## API Endpoint

### `GET /api/booking/verify/[reference]`

**Request:**
```
GET /api/booking/verify/EEO-12345678-ABC123
```

**Response (Success):**
```json
{
  "success": true,
  "booking": {
    "bookingReference": "EEO-12345678-ABC123",
    "tour": {
      "title": "Pyramids of Giza Day Tour",
      "image": "...",
      "duration": "8 hours"
    },
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "date": "2025-12-01",
    "time": "09:00 AM",
    "guests": 2,
    "adultGuests": 2,
    "childGuests": 0,
    "infantGuests": 0,
    "totalPrice": 150,
    "status": "Confirmed",
    "selectedBookingOption": {
      "title": "Premium Package",
      "price": 75
    },
    "specialRequests": "Wheelchair accessible",
    "emergencyContact": "+1234567890",
    "createdAt": "2025-11-20T10:30:00Z"
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "message": "Booking not found"
}
```

## Testing the Feature

### 1. **Create a Test Booking**
```bash
# Make a booking through the checkout process
# The booking confirmation email will be sent automatically
```

### 2. **Check Email**
- Open the booking confirmation email
- You should see the QR code in the "Digital Pass" section

### 3. **Scan QR Code**
- Use your phone's camera or QR code scanner app
- Scan the QR code from the email
- You'll be redirected to the booking verification page

### 4. **Verify Display**
- Check that all booking details are displayed correctly
- Verify the status badge color matches the booking status
- Test the support contact links (Email & WhatsApp)

### 5. **Direct URL Test**
You can also test by directly visiting:
```
http://localhost:3098/booking/verify/YOUR-BOOKING-REFERENCE
```

## Environment Variables Required

Ensure these are set in your `.env` file:

```env
# Base URL for QR code generation
NEXT_PUBLIC_APP_URL=https://egypt-excursionsonline.com
# OR
NEXT_PUBLIC_BASE_URL=https://egypt-excursionsonline.com

# Required for email sending
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
```

## Use Cases

### For Customers:
- 📱 Quick access to booking details on mobile
- 💾 No need to carry printed confirmations
- 🔗 Easy sharing of booking info with travel companions
- ✅ Instant verification at meeting points

### For Staff/Tour Guides:
- 📸 Quick scan to verify customer bookings
- ✅ Confirm booking status before tour starts
- 👥 View guest count and special requests
- 📞 Access emergency contact if needed

## Error Handling

### Fallback Mechanism:
If QR code generation fails:
1. Email is still sent (without QR code)
2. Error is logged to console
3. Customer can still use the "Manage My Booking" button
4. No disruption to the booking process

### Invalid/Not Found Bookings:
- Clean error page with helpful message
- "Return to Home" button
- Suggests contacting support

## Future Enhancements

### Potential Additions:
- [ ] Add QR code to trip reminder emails
- [ ] Generate PDF ticket with QR code for download
- [ ] Admin dashboard to scan and check-in customers
- [ ] QR code expiry for added security
- [ ] Analytics on QR code scans
- [ ] Multi-language support for verification page
- [ ] Offline QR code verification capability

## Dependencies

The feature uses the existing `qrcode` package (already in package.json):
```json
{
  "dependencies": {
    "qrcode": "^1.5.4"
  }
}
```

No additional installations required! ✅

## Support

For issues or questions about this feature:
- Email: booking@egypt-excursionsonline.com
- WhatsApp: +20 11 42255624

---

**Feature Status:** ✅ Deployed to Production  
**Commit:** `0a8ab34`  
**Date:** November 19, 2025

