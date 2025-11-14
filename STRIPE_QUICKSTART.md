# Stripe Payment - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Choose Your Mode

#### For Testing (Recommended)
```bash
# 1. Get test keys from Stripe Dashboard (Test mode)
# 2. Update .env with test keys:
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 3. Restart server
npm run dev
```

#### For Live Payments (Already Configured)
```bash
# Already set up with live keys
# Real charges will occur!
npm run dev
```

### Step 2: Test Payment Flow

1. **Start server:** `npm run dev`
2. **Add tour to cart:** Browse and add items
3. **Go to checkout:** Click checkout button
4. **Fill contact info:** Enter your details
5. **Enter card:** Use Stripe payment form
   - Test mode: `4242 4242 4242 4242`
   - Live mode: Real card required
6. **Complete payment:** Click "Complete Payment"
7. **Verify success:** Check confirmation email

### Step 3: Verify Everything Works

```bash
# Run verification script
npx tsx scripts/verify-stripe.ts

# Should show:
# ✓ All checks passed!
# ✓ Successfully connected to Stripe API
```

---

## 📁 New Files Overview

### Critical Files
- **`.env`** - Stripe keys added (DO NOT COMMIT!)
- **`app/checkout/page.tsx`** - Updated with Stripe form
- **`components/StripePaymentForm.tsx`** - Payment form component

### API Endpoints
- **`app/api/checkout/create-payment-intent/route.ts`** - Creates payments
- **`app/api/checkout/route.ts`** - Processes bookings
- **`app/api/webhooks/stripe/route.ts`** - Handles events

### Documentation
- **`STRIPE_INTEGRATION_COMPLETE.md`** - Complete summary
- **`STRIPE_TESTING_GUIDE.md`** - Detailed testing guide
- **`STRIPE_INTEGRATION.md`** - Integration reference
- **`scripts/verify-stripe.ts`** - Verification script

---

## 🎯 Quick Commands

```bash
# Start development server
npm run dev

# Verify Stripe configuration
npx tsx scripts/verify-stripe.ts

# Build for production
npm run build

# Test webhook locally (optional)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## ⚠️ Important Reminders

### Currently Using: LIVE KEYS
- **Real charges will occur**
- Switch to test mode for safe testing
- Monitor: [Stripe Dashboard](https://dashboard.stripe.com)

### Test Cards (Test Mode Only)
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0027 6000 3184
- **Expiry:** Any future date
- **CVC:** Any 3 digits

---

## 🔍 Quick Check

✅ Stripe keys in `.env`
✅ Server running: `npm run dev`
✅ No build errors
✅ Verification script passed
✅ Stripe Dashboard accessible

---

## 🆘 Need Help?

### Quick Fixes
- **"Payment failed"** → Check Stripe Dashboard logs
- **"Key not found"** → Restart server after .env changes
- **"Webhook error"** → Add STRIPE_WEBHOOK_SECRET to .env

### Resources
- **Full Docs:** See `STRIPE_INTEGRATION_COMPLETE.md`
- **Testing Guide:** See `STRIPE_TESTING_GUIDE.md`
- **Stripe Docs:** https://stripe.com/docs
- **Dashboard:** https://dashboard.stripe.com

---

## ✨ You're All Set!

Your Stripe integration is complete and ready to use!

**Next:** Test a payment flow to verify everything works.

```bash
npm run dev
# → Visit http://localhost:3000
# → Add tour to cart
# → Complete checkout
# → Check Stripe Dashboard for payment
```

---

**Status:** 🟢 Ready
**Build:** ✅ Passed
**Integration:** ✅ Complete
