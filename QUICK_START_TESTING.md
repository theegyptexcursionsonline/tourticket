# Quick Start Testing Guide

## 🚀 Immediate Testing Steps

### Step 1: Start Development Server
```bash
cd /Users/ranjitrajput/Desktop/Repos/tourticket
npm run dev
```

### Step 2: Access Mock Booking Data
Open in browser or use curl:
```bash
# Get all 5 mock bookings
curl http://localhost:3000/api/test-bookings | json_pp

# Or visit in browser:
http://localhost:3000/api/test-bookings
```

### Step 3: Test Customer Booking Page

#### Option A: With Real Booking
1. Login as a customer
2. Navigate to: `http://localhost:3000/user/bookings`
3. Click on any existing booking
4. View the enhanced details page

#### Option B: With Mock Data (Use mock IDs from API)
```
http://localhost:3000/user/bookings/507f1f77bcf86cd799439011
```

**What to Check:**
- ✅ QR Code displays (top left)
- ✅ Booking reference shows (format: EEO-XXXXX-XXXXX)
- ✅ Tour image and details visible
- ✅ Pricing breakdown section complete
- ✅ All participant types listed (Adults/Children/Infants)
- ✅ Add-ons show with correct pricing
- ✅ Special requests in amber box (if present)
- ✅ Emergency contact in rose box (if present)
- ✅ Status badge color-coded
- ✅ Cancel button visible (if > 24h before tour)

### Step 4: Test Admin Booking Page

1. Login as admin
2. Navigate to: `http://localhost:3000/admin/bookings`
3. Click on any booking
4. Or directly access:
```
http://localhost:3000/admin/bookings/507f1f77bcf86cd799439011
```

**What to Check:**
- ✅ All customer features visible
- ✅ Status dropdown functional
- ✅ Customer email/phone links work (clickable)
- ✅ QR code displays
- ✅ Export button present
- ✅ Admin notes section visible
- ✅ Last updated timestamp shows

### Step 5: Test All Mock Scenarios

Use these booking IDs to test different scenarios:

#### 1. Complete Booking (All Features)
```
ID: 507f1f77bcf86cd799439011
Reference: EEO-12345678-ABC123
Status: Confirmed
Participants: 2 Adults, 2 Children
Add-ons: ✅ Yes (2)
Special Requests: ✅ Yes
Emergency Contact: ✅ Yes
Total: $235.50
```

#### 2. Pending Booking
```
ID: 507f1f77bcf86cd799439016
Reference: EEO-87654321-XYZ789
Status: Pending
Participants: 2 Adults
Add-ons: ❌ No
Total: $116.05
```

#### 3. Cancelled Booking
```
ID: 507f1f77bcf86cd799439018
Reference: EEO-11223344-DEF456
Status: Cancelled
Participants: 2 Adults, 1 Child
Add-ons: ✅ Yes (1)
Total: $192.15
```

#### 4. Minimal/Guest Booking
```
ID: 507f1f77bcf86cd799439021
Reference: EEO-99887766-GHI789
Status: Confirmed
Participants: 1 Adult
Add-ons: ❌ No
Special Requests: ❌ No
Total: $37.80
```

#### 5. Family with Infant
```
ID: 507f1f77bcf86cd799439024
Reference: EEO-55667788-JKL012
Status: Confirmed
Participants: 2 Adults, 2 Children, 1 Infant
Add-ons: ✅ Yes (2)
Special Requests: ✅ Yes (baby needs)
Total: $280.20
```

## 📱 Mobile Testing

### Test on Different Screen Sizes:

#### Mobile (< 768px)
```bash
# Chrome DevTools:
1. Press F12
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or "Pixel 5"
4. Navigate to booking detail pages
```

**Check:**
- ✅ Layout stacks vertically
- ✅ QR code remains visible
- ✅ Buttons are touch-friendly
- ✅ Text is readable
- ✅ No horizontal scroll

#### Tablet (768px - 1024px)
```bash
# Chrome DevTools:
1. Select "iPad" or "iPad Pro"
2. Test in both portrait and landscape
```

**Check:**
- ✅ 2-column layout works
- ✅ Spacing is appropriate
- ✅ Cards are properly sized

#### Desktop (> 1024px)
```bash
# Test at different resolutions:
1. 1366x768 (common laptop)
2. 1920x1080 (full HD)
3. 2560x1440 (2K)
```

**Check:**
- ✅ 3-column layout displays
- ✅ Maximum width respected (6xl/7xl)
- ✅ Content is centered

## 🔍 Feature Verification Checklist

### Pricing Breakdown
- [ ] Adult price calculation correct
- [ ] Child price (50% of adult) correct
- [ ] Infant shows as FREE
- [ ] Per-guest add-ons multiply by (adults + children)
- [ ] Per-booking add-ons show flat rate
- [ ] Service fee (3%) calculated correctly
- [ ] Tax (5%) calculated correctly
- [ ] Total matches expected amount

### QR Code
- [ ] QR code generates successfully
- [ ] QR code is 300x300px
- [ ] QR code only shows for Confirmed bookings
- [ ] Scanning QR code goes to correct URL format
- [ ] Instructions text displays below QR code

### Participant Display
- [ ] Adult count displays
- [ ] Child count displays (if > 0)
- [ ] Infant count displays (if > 0)
- [ ] Format is readable: "2 Adults, 1 Child"
- [ ] Pricing breakdown shows per participant type

### Add-ons
- [ ] All selected add-ons display
- [ ] Per-guest add-ons show guest count
- [ ] Per-booking add-ons show flat rate
- [ ] Pricing calculation is correct
- [ ] Add-on details (title, price) visible

### Status Display
- [ ] Confirmed = Green badge
- [ ] Pending = Yellow badge
- [ ] Cancelled = Red badge
- [ ] Status icon displays correctly
- [ ] Admin can change status (admin page only)

### Special Sections
- [ ] Special requests show in amber highlight
- [ ] Emergency contact shows in rose highlight
- [ ] Important info box displays
- [ ] Meeting point information visible
- [ ] Booking option details complete

## 🧪 API Testing

### Test with Curl
```bash
# Get all bookings
curl -X GET http://localhost:3000/api/test-bookings

# Create/update booking
curl -X POST http://localhost:3000/api/test-bookings \
  -H "Content-Type: application/json" \
  -d '{
    "_id": "test123",
    "bookingReference": "EEO-TEST-001",
    "status": "Confirmed",
    "totalPrice": 100.00
  }'
```

### Test with Postman
1. Import the endpoint: `http://localhost:3000/api/test-bookings`
2. Send GET request
3. Verify response structure
4. Check all 5 mock scenarios in response

## 🎯 Common Issues & Solutions

### Issue: QR Code Not Showing
**Solution:** Check that:
- Booking status is "Confirmed"
- `qrcode` package is installed: `npm install qrcode`
- Browser console for errors

### Issue: Pricing Doesn't Match
**Solution:** Verify:
- Adult guests × base price
- Child guests × (base price / 2)
- Add-on calculations (per-guest vs per-booking)
- Service fee = subtotal × 0.03
- Tax = subtotal × 0.05

### Issue: Mock API Returns 404
**Solution:**
- Ensure server is running: `npm run dev`
- Check URL: `/api/test-bookings` (not `/test-bookings`)
- Verify file exists at `/app/api/test-bookings/route.ts`

### Issue: Admin Page Not Accessible
**Solution:**
- Login with admin credentials
- Check admin permissions in `withAuth` HOC
- Verify `manageBookings` permission

### Issue: Page Layout Broken on Mobile
**Solution:**
- Clear browser cache
- Check CSS classes (Tailwind)
- Test in incognito mode
- Verify responsive classes (lg:, md:, sm:)

## 📊 Expected Results

### Customer Page Success:
```
✅ QR code visible (300x300px, centered)
✅ Booking reference: EEO-XXXXX-XXXXX
✅ Tour image and title
✅ Complete pricing breakdown (8-10 lines)
✅ All sections organized with icons
✅ Colored highlights for special info
✅ Cancel button (if eligible)
✅ Mobile responsive
```

### Admin Page Success:
```
✅ All customer features
✅ Status dropdown functional
✅ Customer contact links (mailto/tel)
✅ QR code for verification
✅ Export button present
✅ Professional admin styling
✅ Last updated timestamp
```

### API Response Success:
```json
{
  "success": true,
  "message": "Mock booking data retrieved successfully",
  "data": [ /* 5 booking objects */ ],
  "mockBooking": { /* primary test booking */ },
  "meta": {
    "total": 5,
    "scenarios": [...]
  }
}
```

## ⏱️ Performance Benchmarks

### Load Times (Expected):
- Customer page: < 1s
- Admin page: < 1s  
- QR code generation: < 100ms
- API response: < 50ms

## 🎓 Quick Reference

### Important Files:
```
Customer Page:  /app/user/bookings/[id]/page.tsx
Admin Page:     /app/admin/bookings/[id]/page.tsx
Mock API:       /app/api/test-bookings/route.ts
Documentation:  /BOOKING_DETAILS_ENHANCEMENT.md
Summary:        /IMPLEMENTATION_SUMMARY.md
```

### Key Components:
```
QR Code:         QRCode.toDataURL()
Pricing Calc:    calculatePricing()
Status Badge:    getStatusBadge()
Detail Item:     DetailItem component
```

### Navigation:
```
Customer Bookings: /user/bookings
Admin Bookings:    /admin/bookings
Single Booking:    /user/bookings/[id] or /admin/bookings/[id]
Mock API:          /api/test-bookings
```

## ✅ Final Checklist

Before considering testing complete:
- [ ] All 5 mock scenarios tested
- [ ] Customer page displays correctly
- [ ] Admin page displays correctly
- [ ] QR codes generate successfully
- [ ] Pricing calculations verified
- [ ] Mobile responsive confirmed
- [ ] Status badges color-coded correctly
- [ ] Add-ons calculate properly
- [ ] Special sections display when data present
- [ ] API returns expected mock data
- [ ] No console errors
- [ ] No linting errors
- [ ] Build successful

---

**Happy Testing! 🎉**

If you encounter any issues, refer to:
- `/BOOKING_DETAILS_ENHANCEMENT.md` for detailed documentation
- `/IMPLEMENTATION_SUMMARY.md` for implementation overview
- Console logs for debugging information

