# Quick Testing Checklist - Tour Ticket Platform

Use this checklist for daily smoke tests and quick regression testing.

## 🚨 Critical Path (Must Test Daily)

### Homepage
- [ ] Page loads without errors
- [ ] Hero section displays
- [ ] Search bar works
- [ ] Featured tours visible
- [ ] All navigation links work

### Search & Browse
- [ ] Search for "Rome" returns results
- [ ] Filter by category works
- [ ] Tour cards display correctly
- [ ] Pagination works

### Tour Booking (CRITICAL)
- [ ] Click on any tour
- [ ] Tour details page loads
- [ ] Select tomorrow's date
- [ ] Set adults to 2
- [ ] Click "Add to Cart"
- [ ] Cart icon updates with count
- [ ] Cart sidebar opens
- [ ] Price calculated correctly

### Checkout (CRITICAL)
- [ ] Click "Proceed to Checkout"
- [ ] Checkout form loads
- [ ] All required fields present
- [ ] Enter test email
- [ ] Use Stripe test card: 4242 4242 4242 4242
- [ ] Payment processes successfully
- [ ] Booking confirmation displays
- [ ] Check email for confirmation

### User Authentication
- [ ] Login page loads
- [ ] Login with test credentials works
- [ ] User dashboard accessible
- [ ] Logout works

### Admin Panel
- [ ] Admin login works
- [ ] Dashboard loads with stats
- [ ] Can view tours list
- [ ] Can view bookings list

---

## 📱 Mobile Quick Test

- [ ] Open site on mobile device/browser
- [ ] Navigation menu (hamburger) works
- [ ] Tour cards display properly
- [ ] Search works on mobile
- [ ] Can add tour to cart
- [ ] Checkout form is usable

---

## 🔍 Visual Quick Check

### Desktop
- [ ] No layout breaks on 1920x1080
- [ ] No layout breaks on 1366x768
- [ ] Images load correctly
- [ ] No horizontal scrolling

### Mobile
- [ ] Test on 375px width (iPhone SE)
- [ ] Test on 414px width (iPhone 11)
- [ ] All text readable
- [ ] Buttons are tappable

---

## ⚡ Performance Quick Check

- [ ] Homepage loads in < 3 seconds
- [ ] Tour page loads in < 3 seconds
- [ ] No console errors on any page
- [ ] Images are optimized (not huge file sizes)

---

## 🔒 Security Quick Check

- [ ] HTTPS enabled (lock icon in browser)
- [ ] Cannot access admin without login
- [ ] Cannot access other users' bookings
- [ ] Test XSS in search: `<script>alert('xss')</script>` (should not execute)

---

## 💳 Payment Quick Test

### Test Cards (Stripe Test Mode)
- [ ] Success: 4242 4242 4242 4242 → Should work
- [ ] Decline: 4000 0000 0000 0002 → Should fail gracefully
- [ ] 3D Secure: 4000 0025 0000 3155 → Should show auth popup

---

## 📋 Pre-Deployment Checklist

Before going live or after major updates:

### Functionality
- [ ] All critical paths tested (see above)
- [ ] All forms validate correctly
- [ ] All links work (no 404s)
- [ ] Email notifications sent
- [ ] PDF tickets generate with QR codes

### Content
- [ ] No placeholder text ("Lorem ipsum")
- [ ] All images have alt text
- [ ] Terms & Privacy pages complete
- [ ] Contact info is correct

### Technical
- [ ] Run Lighthouse (target: 90+ on all metrics)
- [ ] No console errors
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test on iOS and Android
- [ ] Environment variables set correctly
- [ ] API keys are production keys (not test)

### Third-Party
- [ ] Stripe production keys active
- [ ] Mailgun sending emails
- [ ] Cloudinary images loading
- [ ] Sentry tracking errors

---

## 🐛 Bug Severity Guide

**Stop Everything (P1 - Critical):**
- Payment not working
- Site completely down
- Users cannot book tours
- Data loss or corruption
- Security vulnerability

**Fix Today (P2 - High):**
- Login/signup broken
- Search not working
- Admin panel inaccessible
- Wrong prices displayed
- Emails not sending

**Fix This Week (P3 - Medium):**
- Minor feature issues
- UI/UX problems
- Non-critical validation errors

**Fix When Possible (P4 - Low):**
- Typos
- Minor UI tweaks
- Enhancement requests

---

## 📊 Test Result Template

```
Test Date: _______________
Tester: _______________
Environment: [ ] Dev [ ] Staging [ ] Production
Browser: _______________
Device: _______________

Critical Path: [ ] PASS [ ] FAIL
Mobile Test: [ ] PASS [ ] FAIL
Performance: [ ] PASS [ ] FAIL

Issues Found: _____

Notes:
_________________________________
_________________________________
```

---

## 🔄 Weekly Regression Tests

Run these once per week or after major updates:

### Week 1: User Features
- [ ] Complete booking flow (all steps)
- [ ] User registration & login
- [ ] Password reset flow
- [ ] User dashboard features
- [ ] Review submission
- [ ] Favorites/wishlist

### Week 2: Admin Features
- [ ] Create new tour
- [ ] Edit existing tour
- [ ] Create destination
- [ ] Create category
- [ ] Manage bookings
- [ ] Create discount code
- [ ] View reports

### Week 3: Edge Cases
- [ ] Book with multiple tours in cart
- [ ] Apply multiple discount codes
- [ ] Cancel booking
- [ ] Test with maximum participants (10+)
- [ ] Test with minimum price tour
- [ ] Test with maximum price tour
- [ ] Test very long tour descriptions

### Week 4: Integrations
- [ ] Stripe payment success/failure
- [ ] Email notifications (all types)
- [ ] PDF ticket generation
- [ ] QR code scanning (if possible)
- [ ] Image uploads (Cloudinary)
- [ ] Search functionality (Fuse.js)

---

## 📞 Quick Reference

**Staging URL:** _____________________
**Admin Login:** admin@tourticket.com
**Test User:** testuser1@example.com
**Stripe Test Card:** 4242 4242 4242 4242

**Bug Reporting:** [Your bug tracking tool URL]
**Documentation:** [Your wiki/docs URL]

---

## 💡 Tips for Efficient Testing

1. **Use browser profiles:** Separate profiles for admin/user testing
2. **Bookmark key pages:** Homepage, login, admin, checkout
3. **Save test data:** Keep test emails, cards, user info handy
4. **Take screenshots:** Always capture bugs with screenshots
5. **Clear cache:** When things look wrong, clear cache first
6. **Check console:** F12 → Console tab for errors
7. **Test in incognito:** Avoid cached data affecting tests
8. **Use tools:** Lighthouse, WAVE, browser DevTools

---

## 📝 Notes Section

Use this space for test-specific notes:

```
_________________________________
_________________________________
_________________________________
_________________________________
_________________________________
```

---

**Last Updated:** [Date]
**Version:** 1.0
