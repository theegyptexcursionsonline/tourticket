# Stripe Webhook Setup - Final Step

## ⚠️ IMPORTANT: One More Step Required

Your Stripe payment integration is complete, but you need to configure webhooks to receive real-time payment notifications.

---

## Quick Setup (5 minutes)

### Step 1: Go to Stripe Dashboard
Visit: https://dashboard.stripe.com/webhooks

### Step 2: Add Webhook Endpoint
1. Click **"Add endpoint"** button
2. Enter your webhook URL:
   ```
   https://preview.egypt-excursionsonline.com/api/webhooks/stripe
   ```

### Step 3: Select Events
Select these events to listen for:
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `charge.succeeded`
- ✅ `charge.refunded`

### Step 4: Copy Webhook Secret
1. After creating the webhook, click on it
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)

### Step 5: Add Secret to Server
Update your `.env` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### Step 6: Restart Server
```bash
# Stop your server (Ctrl+C)
# Then restart:
npm run dev
```

---

## That's It!

Your Stripe integration is now **100% complete** and will:
- ✅ Process payments in real-time
- ✅ Create bookings automatically
- ✅ Send confirmation emails
- ✅ Handle payment failures gracefully
- ✅ Receive webhook events for all transactions

---

## Verify It's Working

After setup, test a payment and check:
1. **Stripe Dashboard → Webhooks** - Should show successful deliveries
2. **Stripe Dashboard → Payments** - Should show completed transactions
3. **Your email** - Should receive booking confirmation

---

## Need Help?

If you see any webhook errors in Stripe Dashboard:
1. Check that the URL is correct: `https://preview.egypt-excursionsonline.com/api/webhooks/stripe`
2. Verify the webhook secret is in `.env`
3. Ensure server was restarted after adding secret

**Support:** If issues persist, check server logs for error messages.

---

**Webhook URL:** `https://preview.egypt-excursionsonline.com/api/webhooks/stripe`
**Current Status:** ⚠️ Needs Configuration
**Time Required:** 5 minutes
