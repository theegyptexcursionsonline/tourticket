# Stripe Payment Integration Guide

## Overview

This project has been integrated with Stripe for secure payment processing using live API keys. The integration includes:

- ✅ Payment Intent creation
- ✅ Stripe Elements for secure card input
- ✅ Webhook handling for payment events
- ✅ Server-side payment verification

## Environment Variables

The following Stripe keys have been added to your `.env` file:

```env
# Stripe Payment Configuration (LIVE KEYS)
# ⚠️ IMPORTANT: Get your actual keys from https://dashboard.stripe.com/apikeys
# DO NOT commit actual API keys to the repository - store them in .env (which is gitignored)
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_RESTRICTED_KEY=rk_live_YOUR_RESTRICTED_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

## Files Created

### 1. API Endpoints

#### `/app/api/checkout/create-payment-intent/route.ts`
Creates a Stripe PaymentIntent and returns the client secret for frontend confirmation.

**Usage:**
```typescript
POST /api/checkout/create-payment-intent
Body: {
  customer: { email, firstName, lastName },
  pricing: { total, currency },
  cart: [...],
  discountCode: "optional"
}
```

#### `/app/api/checkout/route.ts` (Updated)
Modified to accept and verify PaymentIntent ID from Stripe Elements.

**New Flow:**
1. Frontend confirms payment with Stripe Elements
2. Backend verifies payment succeeded
3. Creates booking in database

#### `/app/api/webhooks/stripe/route.ts`
Handles Stripe webhook events (payment succeeded, failed, refunded, etc.)

### 2. Utility Files

#### `/lib/stripe.ts`
Stripe client initialization helper for frontend use.

#### `/components/StripePaymentForm.tsx`
Complete Stripe Elements payment form component.

## Integration Steps

### Step 1: Set Up Stripe Webhook (Required for Production)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.refunded`
5. Copy the webhook signing secret
6. Add it to your `.env` file:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### Step 2: Test Webhook Locally (Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe

# Login to Stripe
stripe login

# Forward webhook events to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# This will output a webhook secret - add it to .env
```

### Step 3: Integrate Payment Form in Checkout Page

Replace the existing payment form in `/app/checkout/page.tsx` with the Stripe Elements component:

```tsx
import StripePaymentForm from '@/components/StripePaymentForm';

// Inside your checkout component, replace the card input section with:
<StripePaymentForm
  amount={pricing.total}
  currency={pricing.currency}
  customer={{
    email: formData.email,
    firstName: formData.firstName,
    lastName: formData.lastName,
  }}
  cart={cart}
  pricing={pricing}
  discountCode={promoCode}
  onSuccess={(paymentIntentId) => {
    // Payment succeeded, now create the booking
    handleBookingCreation(paymentIntentId);
  }}
  onError={(error) => {
    toast.error(error);
  }}
/>
```

### Step 4: Update Checkout Handler

Modify your checkout submission to include the PaymentIntent ID:

```typescript
const handleBookingCreation = async (paymentIntentId: string) => {
  setIsProcessing(true);

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { ...formData },
        cart,
        pricing,
        paymentDetails: {
          paymentIntentId, // Include this
          cardholderName: formData.cardholderName,
        },
        userId: user?._id,
        isGuest: !user,
        discountCode: discount > 0 ? promoCode : null,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Show success message
      setIsConfirmed(true);
      clearCart();
    }
  } catch (error) {
    console.error('Booking error:', error);
  } finally {
    setIsProcessing(false);
  }
};
```

## Testing the Integration

### Test Cards (Use only in development with test keys)

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0027 6000 3184

**For any card:**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

### With Live Keys (Production)

⚠️ **IMPORTANT:** With live keys, real cards will be charged. Make sure to:

1. Test thoroughly in Stripe test mode first
2. Start with small amounts
3. Have a refund policy ready
4. Monitor the Stripe dashboard for any issues

## Security Best Practices

✅ **Already Implemented:**

- API keys stored in environment variables
- Webhook signature verification
- Amount verification before processing
- Server-side payment confirmation

⚠️ **Additional Recommendations:**

1. **Never log sensitive data** (card numbers, CVV, etc.)
2. **Use HTTPS** in production (required by Stripe)
3. **Implement rate limiting** on payment endpoints
4. **Monitor failed payments** in Stripe Dashboard
5. **Set up fraud prevention** rules in Stripe
6. **Enable 3D Secure** for enhanced security

## Stripe Dashboard Configuration

### Enable Payment Methods

Go to: Settings → Payment methods
- Enable Card payments ✅
- Enable Apple Pay/Google Pay (optional)
- Enable other local payment methods as needed

### Set Up Email Receipts

Go to: Settings → Emails
- Enable automatic receipts ✅
- Customize email branding

### Configure Radar Rules (Fraud Prevention)

Go to: Radar → Rules
- Review default rules
- Add custom rules based on your business needs

## Troubleshooting

### Payment Intent Not Creating

- Check that `STRIPE_SECRET_KEY` is set correctly
- Verify the API version matches (`2024-12-18.acacia`)
- Check server logs for error messages

### Webhook Not Receiving Events

- Verify `STRIPE_WEBHOOK_SECRET` is set
- Test with Stripe CLI: `stripe trigger payment_intent.succeeded`
- Check webhook endpoint is publicly accessible (not localhost in production)

### Payment Succeeded but Booking Not Created

- Check webhook logs in Stripe Dashboard
- Verify database connection
- Check server logs for errors

## Support & Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

## Migration Notes

### From Mock Payments

The previous mock payment system has been replaced with real Stripe integration. The fallback mode in `/app/api/checkout/route.ts` will attempt auto-confirmation, but this won't work with live keys. Make sure to:

1. Integrate `StripePaymentForm` component in checkout page
2. Update checkout flow to use PaymentIntent ID
3. Test thoroughly before going live

---

**Last Updated:** 2025-01-14
**Stripe API Version:** 2024-12-18.acacia
