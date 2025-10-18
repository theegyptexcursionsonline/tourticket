# QA Testing Guide - Tour Ticket Platform

## Table of Contents
1. [Application Overview](#application-overview)
2. [Testing Environment Setup](#testing-environment-setup)
3. [Test User Accounts](#test-user-accounts)
4. [Critical User Flows](#critical-user-flows)
5. [Feature Testing Guide](#feature-testing-guide)
6. [Test Cases by Module](#test-cases-by-module)
7. [Browser & Device Testing](#browser--device-testing)
8. [Performance Testing](#performance-testing)
9. [Security Testing](#security-testing)
10. [Bug Reporting Guidelines](#bug-reporting-guidelines)
11. [Testing Checklists](#testing-checklists)

---

## Application Overview

**Tour Ticket** is a full-stack tour booking platform that allows users to:
- Browse and search tours by destination, category, and interests
- Book tours with date/time selection and add-ons
- Make secure payments via Stripe
- Manage bookings and download PDF tickets with QR codes
- Leave reviews and ratings
- View blog content and attraction pages

**Admin users** can:
- Manage tours, destinations, categories, and attractions
- View analytics and revenue reports
- Manage bookings and users
- Create discount codes
- Moderate reviews and manage content

**Tech Stack:**
- Frontend: Next.js 15.5 with TypeScript, Tailwind CSS
- Backend: Node.js with MongoDB (Mongoose)
- Payments: Stripe
- Authentication: JWT (HTTP-only cookies)
- Email: Mailgun

---

## Testing Environment Setup

### Prerequisites
1. Access to staging/development environment URL
2. Test credit cards from Stripe (provided below)
3. Modern web browsers (Chrome, Firefox, Safari, Edge)
4. Mobile devices or browser dev tools for responsive testing

### Environment URLs
- **Development:** http://localhost:3000
- **Staging:** [Your staging URL]
- **Production:** [Your production URL]

### Test Payment Cards (Stripe Test Mode)
- **Successful Payment:** 4242 4242 4242 4242
- **Declined Payment:** 4000 0000 0000 0002
- **Requires Authentication:** 4000 0025 0000 3155
- **Use any future expiry date, any 3-digit CVC, any postal code**

---

## Test User Accounts

### Regular Users
```
Email: testuser1@example.com
Password: Test123!

Email: testuser2@example.com
Password: Test123!
```

### Admin Users
```
Email: admin@tourticket.com
Password: Admin123!
```

**Note:** Confirm these credentials with the development team before testing.

---

## Critical User Flows

These are the most important user journeys that MUST work flawlessly:

### 1. Tour Booking Flow (CRITICAL)
```
Homepage → Search/Browse Tours → Tour Detail Page →
Select Date & Participants → Add to Cart →
Checkout → Payment → Booking Confirmation → Email Sent
```

### 2. User Registration & Login
```
Homepage → Sign Up → Email Verification (if enabled) →
Login → User Dashboard
```

### 3. Payment Processing
```
Cart → Checkout → Enter Details → Apply Discount Code →
Submit Payment → Success/Failure → Booking Created
```

### 4. Admin Tour Management
```
Admin Login → Tours Page → Create New Tour →
Add Details & Images → Publish → Verify on Frontend
```

---

## Feature Testing Guide

### 1. Homepage

#### Elements to Verify:
- [ ] Hero section with slideshow/banner image loads correctly
- [ ] Search bar is functional
- [ ] Featured destinations display
- [ ] Popular tours section shows correct tours
- [ ] Categories/interests cards are clickable
- [ ] Newsletter signup form works
- [ ] All navigation links work
- [ ] Footer links are correct
- [ ] Page loads within 3 seconds

#### Test Cases:
1. **TC-HOME-001:** Verify hero slideshow rotates images every 6 seconds
2. **TC-HOME-002:** Search for "Rome" in search bar, verify results page
3. **TC-HOME-003:** Click on a featured destination, verify navigation
4. **TC-HOME-004:** Test newsletter signup with valid/invalid emails
5. **TC-HOME-005:** Verify all stats counters display correctly

---

### 2. Search & Filtering

#### Elements to Verify:
- [ ] Search by destination name
- [ ] Search by tour title
- [ ] Filter by category
- [ ] Filter by price range
- [ ] Filter by duration
- [ ] Filter by rating
- [ ] Sort functionality (price, rating, popularity)
- [ ] Search results pagination
- [ ] "No results" message when applicable
- [ ] Live search suggestions appear

#### Test Cases:
1. **TC-SEARCH-001:** Search for existing tour, verify results
2. **TC-SEARCH-002:** Search for non-existent tour, verify "no results"
3. **TC-SEARCH-003:** Apply multiple filters simultaneously
4. **TC-SEARCH-004:** Clear all filters, verify all tours return
5. **TC-SEARCH-005:** Test search with special characters
6. **TC-SEARCH-006:** Verify pagination works correctly
7. **TC-SEARCH-007:** Test sort by price (low to high, high to low)

---

### 3. Tour Detail Page

#### Elements to Verify:
- [ ] Tour title and images display correctly
- [ ] Price (original and discount) shown
- [ ] Duration, rating, and booking count visible
- [ ] Description and long description readable
- [ ] Highlights list displays
- [ ] What's included/not included sections
- [ ] Itinerary (if available) is expandable
- [ ] FAQ section works
- [ ] Reviews section loads
- [ ] Related tours display
- [ ] Add to cart button functional
- [ ] Date picker works
- [ ] Participant selectors (adults, children, infants)
- [ ] Add-ons can be selected
- [ ] Booking options selectable

#### Test Cases:
1. **TC-TOUR-001:** Verify all tour information loads correctly
2. **TC-TOUR-002:** Click through all tour images in gallery
3. **TC-TOUR-003:** Select a date in the past, verify it's blocked
4. **TC-TOUR-004:** Select today's date, verify availability
5. **TC-TOUR-005:** Increase adult count to 10, verify price updates
6. **TC-TOUR-006:** Add optional add-ons, verify price calculation
7. **TC-TOUR-007:** Select different booking options, verify price changes
8. **TC-TOUR-008:** Click "Add to Cart" without selecting date, verify validation
9. **TC-TOUR-009:** Add tour to cart successfully, verify cart icon updates
10. **TC-TOUR-010:** Click related tours, verify navigation

---

### 4. Shopping Cart

#### Elements to Verify:
- [ ] Cart icon shows item count
- [ ] Cart sidebar/page opens
- [ ] All cart items display correctly
- [ ] Quantity can be modified
- [ ] Remove item functionality
- [ ] Subtotal calculation correct
- [ ] Discount code input field
- [ ] Apply/remove discount code
- [ ] Total price updates correctly
- [ ] "Proceed to Checkout" button visible
- [ ] Cart persists across page refreshes
- [ ] Empty cart message when no items

#### Test Cases:
1. **TC-CART-001:** Add multiple tours to cart, verify all display
2. **TC-CART-002:** Modify participant count in cart, verify price update
3. **TC-CART-003:** Remove item from cart, verify it disappears
4. **TC-CART-004:** Apply valid discount code, verify discount applied
5. **TC-CART-005:** Apply invalid discount code, verify error message
6. **TC-CART-006:** Remove discount code, verify price reverts
7. **TC-CART-007:** Clear entire cart, verify empty state
8. **TC-CART-008:** Add same tour twice with different dates, verify both in cart
9. **TC-CART-009:** Refresh page, verify cart persists

---

### 5. Checkout & Payment

#### Elements to Verify:
- [ ] Checkout form loads
- [ ] User details pre-filled (if logged in)
- [ ] Billing information fields
- [ ] Contact information fields
- [ ] Special requests textarea
- [ ] Emergency contact field
- [ ] Order summary displays correctly
- [ ] Stripe payment form loads
- [ ] Card input validation
- [ ] Terms and conditions checkbox
- [ ] Submit button enabled only when form valid
- [ ] Loading state during payment processing
- [ ] Success/failure messages

#### Test Cases:
1. **TC-CHECKOUT-001:** Proceed to checkout as guest user
2. **TC-CHECKOUT-002:** Proceed to checkout as logged-in user
3. **TC-CHECKOUT-003:** Submit form with missing required fields, verify validation
4. **TC-CHECKOUT-004:** Enter invalid email format, verify validation
5. **TC-CHECKOUT-005:** Use test card 4242 4242 4242 4242, verify successful payment
6. **TC-CHECKOUT-006:** Use test card 4000 0000 0000 0002, verify declined payment
7. **TC-CHECKOUT-007:** Use 3D Secure test card, verify authentication flow
8. **TC-CHECKOUT-008:** Close checkout without completing, verify cart remains
9. **TC-CHECKOUT-009:** Complete payment, verify booking confirmation page
10. **TC-CHECKOUT-010:** Verify confirmation email sent (check spam folder)

---

### 6. User Authentication

#### Elements to Verify:
- [ ] Signup form validation
- [ ] Login form validation
- [ ] Password strength indicator
- [ ] "Forgot Password" link
- [ ] Password reset flow
- [ ] Social login (if implemented)
- [ ] Remember me checkbox
- [ ] Logout functionality
- [ ] Session timeout handling
- [ ] Redirect after login

#### Test Cases:
1. **TC-AUTH-001:** Sign up with valid email and password
2. **TC-AUTH-002:** Sign up with existing email, verify error
3. **TC-AUTH-003:** Sign up with weak password, verify validation
4. **TC-AUTH-004:** Login with valid credentials
5. **TC-AUTH-005:** Login with invalid credentials, verify error
6. **TC-AUTH-006:** Login with unregistered email, verify error
7. **TC-AUTH-007:** Click "Forgot Password", verify reset email sent
8. **TC-AUTH-008:** Reset password using email link
9. **TC-AUTH-009:** Logout, verify session cleared
10. **TC-AUTH-010:** Access protected page while logged out, verify redirect

---

### 7. User Dashboard

#### Elements to Verify:
- [ ] Dashboard welcome message with user name
- [ ] Upcoming bookings section
- [ ] Past bookings section
- [ ] Booking details (date, tour, status)
- [ ] Download ticket button
- [ ] Cancel booking option
- [ ] Profile edit link
- [ ] Favorites/wishlist
- [ ] Change password option
- [ ] Booking status badges

#### Test Cases:
1. **TC-DASH-001:** Access dashboard after login
2. **TC-DASH-002:** Verify all bookings display correctly
3. **TC-DASH-003:** Click on booking to view details
4. **TC-DASH-004:** Download PDF ticket, verify QR code present
5. **TC-DASH-005:** Cancel a booking, verify status changes
6. **TC-DASH-006:** Edit profile information, verify update
7. **TC-DASH-007:** Change password successfully
8. **TC-DASH-008:** Add/remove tours from favorites
9. **TC-DASH-009:** Filter bookings by status
10. **TC-DASH-010:** Verify past bookings separated from upcoming

---

### 8. Reviews & Ratings

#### Elements to Verify:
- [ ] Review form appears (only for verified bookings)
- [ ] Star rating selector
- [ ] Title and comment fields
- [ ] Image upload (if enabled)
- [ ] Submit review button
- [ ] Reviews display on tour page
- [ ] Review sorting options
- [ ] Helpful/not helpful buttons
- [ ] Verified reviewer badge
- [ ] Average rating calculation

#### Test Cases:
1. **TC-REVIEW-001:** Submit review for completed booking
2. **TC-REVIEW-002:** Try to review without booking, verify blocked
3. **TC-REVIEW-003:** Submit review without rating, verify validation
4. **TC-REVIEW-004:** Submit review with 1-5 stars, verify submission
5. **TC-REVIEW-005:** Edit existing review
6. **TC-REVIEW-006:** Delete review
7. **TC-REVIEW-007:** Mark review as helpful, verify count increases
8. **TC-REVIEW-008:** Verify reviews sort by date/rating
9. **TC-REVIEW-009:** Verify only one review per user per tour

---

### 9. Destinations

#### Elements to Verify:
- [ ] Destinations listing page
- [ ] Destination detail page
- [ ] Destination hero image/slideshow
- [ ] Destination description
- [ ] Tour count for destination
- [ ] Tours filtered by destination
- [ ] Related destinations section
- [ ] Destination highlights
- [ ] Travel tips section
- [ ] FAQ section
- [ ] Stats section (tours available, travelers, rating)

#### Test Cases:
1. **TC-DEST-001:** Browse all destinations page
2. **TC-DEST-002:** Click on specific destination
3. **TC-DEST-003:** Verify tours display for that destination
4. **TC-DEST-004:** Verify destination info (currency, timezone, best time)
5. **TC-DEST-005:** Click on related destination, verify navigation
6. **TC-DEST-006:** Verify search works within destination page
7. **TC-DEST-007:** Verify stats display correctly

---

### 10. Categories & Interests

#### Elements to Verify:
- [ ] Categories page lists all categories
- [ ] Category icons display
- [ ] Tour count per category
- [ ] Category detail page
- [ ] Tours filtered by category
- [ ] Category highlights and features
- [ ] Grid layout configuration

#### Test Cases:
1. **TC-CAT-001:** View all categories
2. **TC-CAT-002:** Click on category, verify filtered tours
3. **TC-CAT-003:** Verify tour count matches actual tours
4. **TC-CAT-004:** Navigate between different categories
5. **TC-CAT-005:** Verify category page layout and content

---

### 11. Blog

#### Elements to Verify:
- [ ] Blog listing page
- [ ] Blog post cards with images
- [ ] Read time displayed
- [ ] Author information
- [ ] Category tags
- [ ] Blog post detail page
- [ ] Full content readable
- [ ] Related articles
- [ ] Like button functionality
- [ ] Share buttons (if enabled)
- [ ] Comments section (if enabled)

#### Test Cases:
1. **TC-BLOG-001:** Access blog page
2. **TC-BLOG-002:** Click on blog post, verify full article loads
3. **TC-BLOG-003:** Like a blog post, verify count increases
4. **TC-BLOG-004:** Filter blog by category
5. **TC-BLOG-005:** Verify related articles display
6. **TC-BLOG-006:** Verify author bio and avatar display

---

### 12. Admin Dashboard

#### Elements to Verify:
- [ ] Admin login page
- [ ] Dashboard analytics/stats
- [ ] Revenue charts
- [ ] Recent bookings list
- [ ] Quick actions menu
- [ ] Navigation sidebar

#### Test Cases:
1. **TC-ADMIN-001:** Login with admin credentials
2. **TC-ADMIN-002:** Verify dashboard stats are accurate
3. **TC-ADMIN-003:** Verify charts render correctly
4. **TC-ADMIN-004:** Access denied for regular users
5. **TC-ADMIN-005:** Logout from admin panel

---

### 13. Admin - Tours Management

#### Elements to Verify:
- [ ] Tours list with search and filters
- [ ] Create new tour button
- [ ] Tour creation form (all fields)
- [ ] Image upload functionality
- [ ] Multiple images upload
- [ ] Rich text editor for descriptions
- [ ] Itinerary builder
- [ ] FAQ builder
- [ ] Booking options configuration
- [ ] Add-ons management
- [ ] Availability settings
- [ ] Publish/unpublish toggle
- [ ] Featured tour toggle
- [ ] Edit tour functionality
- [ ] Delete tour with confirmation
- [ ] Bulk actions (if available)

#### Test Cases:
1. **TC-ADMIN-TOUR-001:** Create new tour with all required fields
2. **TC-ADMIN-TOUR-002:** Create tour without required fields, verify validation
3. **TC-ADMIN-TOUR-003:** Upload tour images (single and multiple)
4. **TC-ADMIN-TOUR-004:** Edit existing tour, verify changes save
5. **TC-ADMIN-TOUR-005:** Delete tour, verify confirmation dialog
6. **TC-ADMIN-TOUR-006:** Publish/unpublish tour, verify visibility on frontend
7. **TC-ADMIN-TOUR-007:** Mark tour as featured, verify homepage display
8. **TC-ADMIN-TOUR-008:** Search tours by name/destination
9. **TC-ADMIN-TOUR-009:** Filter tours by status/category
10. **TC-ADMIN-TOUR-010:** Add itinerary items with time and descriptions
11. **TC-ADMIN-TOUR-011:** Configure booking options with different prices
12. **TC-ADMIN-TOUR-012:** Set availability dates and times

---

### 14. Admin - Bookings Management

#### Elements to Verify:
- [ ] All bookings list
- [ ] Booking filters (status, date, tour)
- [ ] Search bookings by reference/email
- [ ] Booking detail view
- [ ] Change booking status
- [ ] Cancel booking
- [ ] Refund processing (if enabled)
- [ ] Export bookings data
- [ ] Booking statistics

#### Test Cases:
1. **TC-ADMIN-BOOK-001:** View all bookings
2. **TC-ADMIN-BOOK-002:** Filter bookings by status (Confirmed/Pending/Cancelled)
3. **TC-ADMIN-BOOK-003:** Search booking by reference number
4. **TC-ADMIN-BOOK-004:** Search booking by customer email
5. **TC-ADMIN-BOOK-005:** View booking details
6. **TC-ADMIN-BOOK-006:** Change booking status from Pending to Confirmed
7. **TC-ADMIN-BOOK-007:** Cancel booking, verify user notification
8. **TC-ADMIN-BOOK-008:** Export bookings to CSV/Excel
9. **TC-ADMIN-BOOK-009:** Filter bookings by date range
10. **TC-ADMIN-BOOK-010:** Verify booking analytics are accurate

---

### 15. Admin - User Management

#### Elements to Verify:
- [ ] Users list
- [ ] User search functionality
- [ ] User role assignment
- [ ] User status (active/inactive)
- [ ] View user bookings
- [ ] Edit user information
- [ ] Delete user account

#### Test Cases:
1. **TC-ADMIN-USER-001:** View all users
2. **TC-ADMIN-USER-002:** Search user by email/name
3. **TC-ADMIN-USER-003:** View user's booking history
4. **TC-ADMIN-USER-004:** Change user role to admin
5. **TC-ADMIN-USER-005:** Deactivate user account
6. **TC-ADMIN-USER-006:** Delete user, verify confirmation

---

### 16. Admin - Destinations Management

#### Elements to Verify:
- [ ] Destinations list
- [ ] Create destination form
- [ ] Destination name and slug
- [ ] Image upload
- [ ] Coordinates/map integration
- [ ] Highlights and features
- [ ] SEO fields (meta title, description, keywords)
- [ ] Publish/unpublish option
- [ ] Featured destination toggle
- [ ] Edit/delete destinations

#### Test Cases:
1. **TC-ADMIN-DEST-001:** Create new destination
2. **TC-ADMIN-DEST-002:** Upload destination image
3. **TC-ADMIN-DEST-003:** Edit destination details
4. **TC-ADMIN-DEST-004:** Delete destination, verify tours are unlinked
5. **TC-ADMIN-DEST-005:** Publish/unpublish destination
6. **TC-ADMIN-DEST-006:** Mark as featured, verify homepage display
7. **TC-ADMIN-DEST-007:** Verify slug auto-generates from name

---

### 17. Admin - Categories Management

#### Elements to Verify:
- [ ] Categories list
- [ ] Create category form
- [ ] Category icon selector
- [ ] Category color picker
- [ ] Hero image upload
- [ ] Description fields
- [ ] Order/priority field
- [ ] Edit/delete categories

#### Test Cases:
1. **TC-ADMIN-CAT-001:** Create new category
2. **TC-ADMIN-CAT-002:** Select category icon and color
3. **TC-ADMIN-CAT-003:** Edit category, verify changes
4. **TC-ADMIN-CAT-004:** Delete category, verify warning if tours exist
5. **TC-ADMIN-CAT-005:** Reorder categories, verify frontend order
6. **TC-ADMIN-CAT-006:** Upload category hero image

---

### 18. Admin - Discounts & Promotions

#### Elements to Verify:
- [ ] Discounts list
- [ ] Create discount code form
- [ ] Code input field
- [ ] Discount type (percentage/fixed)
- [ ] Discount value
- [ ] Minimum purchase amount
- [ ] Start/end dates
- [ ] Usage limit
- [ ] Active/inactive status
- [ ] Edit/delete discounts

#### Test Cases:
1. **TC-ADMIN-DISC-001:** Create percentage discount (e.g., 10%)
2. **TC-ADMIN-DISC-002:** Create fixed amount discount (e.g., $20)
3. **TC-ADMIN-DISC-003:** Set minimum purchase amount
4. **TC-ADMIN-DISC-004:** Set usage limit to 100
5. **TC-ADMIN-DISC-005:** Set start and end dates
6. **TC-ADMIN-DISC-006:** Test discount on frontend checkout
7. **TC-ADMIN-DISC-007:** Deactivate discount, verify not usable
8. **TC-ADMIN-DISC-008:** Delete discount code
9. **TC-ADMIN-DISC-009:** Verify usage count increments on use

---

### 19. Admin - Reviews Moderation

#### Elements to Verify:
- [ ] All reviews list
- [ ] Filter by tour
- [ ] Filter by rating
- [ ] Pending reviews section
- [ ] Approve/reject reviews
- [ ] Delete reviews
- [ ] View review details

#### Test Cases:
1. **TC-ADMIN-REV-001:** View all reviews
2. **TC-ADMIN-REV-002:** Filter reviews by tour
3. **TC-ADMIN-REV-003:** Filter reviews by rating (1-5 stars)
4. **TC-ADMIN-REV-004:** Approve pending review
5. **TC-ADMIN-REV-005:** Reject inappropriate review
6. **TC-ADMIN-REV-006:** Delete review with confirmation
7. **TC-ADMIN-REV-007:** View reviewer information

---

### 20. Admin - Blog Management

#### Elements to Verify:
- [ ] Blog posts list
- [ ] Create new post button
- [ ] Rich text editor
- [ ] Featured image upload
- [ ] Category selection
- [ ] Tags input
- [ ] Author field
- [ ] SEO fields
- [ ] Publish status (draft/published/scheduled)
- [ ] Schedule publish date
- [ ] Featured post toggle
- [ ] Edit/delete posts

#### Test Cases:
1. **TC-ADMIN-BLOG-001:** Create new blog post as draft
2. **TC-ADMIN-BLOG-002:** Upload featured image
3. **TC-ADMIN-BLOG-003:** Use rich text editor (bold, italics, links, images)
4. **TC-ADMIN-BLOG-004:** Add tags and select category
5. **TC-ADMIN-BLOG-005:** Publish post immediately
6. **TC-ADMIN-BLOG-006:** Schedule post for future date
7. **TC-ADMIN-BLOG-007:** Mark post as featured
8. **TC-ADMIN-BLOG-008:** Edit published post
9. **TC-ADMIN-BLOG-009:** Delete post with confirmation
10. **TC-ADMIN-BLOG-010:** Verify published post appears on frontend

---

### 21. Admin - Attraction Pages

#### Elements to Verify:
- [ ] Attraction pages list
- [ ] Create attraction page
- [ ] Page type selector (attraction/category)
- [ ] Hero image upload
- [ ] Multiple images
- [ ] Highlights and features
- [ ] Grid configuration
- [ ] Link tours to attraction
- [ ] SEO settings
- [ ] Publish/unpublish

#### Test Cases:
1. **TC-ADMIN-ATTR-001:** Create new attraction page
2. **TC-ADMIN-ATTR-002:** Upload hero and gallery images
3. **TC-ADMIN-ATTR-003:** Add highlights and features
4. **TC-ADMIN-ATTR-004:** Link tours to attraction
5. **TC-ADMIN-ATTR-005:** Configure grid layout
6. **TC-ADMIN-ATTR-006:** Publish and verify on frontend
7. **TC-ADMIN-ATTR-007:** Edit attraction page
8. **TC-ADMIN-ATTR-008:** Delete attraction page

---

### 22. Admin - Hero Settings

#### Elements to Verify:
- [ ] Hero images list
- [ ] Upload new hero image
- [ ] Set image active/inactive
- [ ] Set image order
- [ ] Delete hero image
- [ ] Preview hero slideshow

#### Test Cases:
1. **TC-ADMIN-HERO-001:** Upload new hero image
2. **TC-ADMIN-HERO-002:** Activate/deactivate hero image
3. **TC-ADMIN-HERO-003:** Reorder hero images
4. **TC-ADMIN-HERO-004:** Delete hero image
5. **TC-ADMIN-HERO-005:** Verify active images show on homepage

---

### 23. Admin - Reports & Analytics

#### Elements to Verify:
- [ ] Revenue chart by date range
- [ ] Bookings chart
- [ ] Top selling tours
- [ ] Revenue by tour
- [ ] Revenue by destination
- [ ] User growth chart
- [ ] Export reports
- [ ] Date range selector

#### Test Cases:
1. **TC-ADMIN-REP-001:** View default dashboard reports
2. **TC-ADMIN-REP-002:** Select custom date range
3. **TC-ADMIN-REP-003:** View revenue breakdown by tour
4. **TC-ADMIN-REP-004:** View top performing destinations
5. **TC-ADMIN-REP-005:** Export report to PDF/CSV
6. **TC-ADMIN-REP-006:** Verify chart data accuracy

---

### 24. Admin - Bulk Operations

#### Elements to Verify:
- [ ] Bulk upload form
- [ ] CSV/JSON file upload
- [ ] Data validation
- [ ] Preview data before import
- [ ] Import tours in bulk
- [ ] Link images to tours
- [ ] Error handling for invalid data
- [ ] Import progress indicator

#### Test Cases:
1. **TC-ADMIN-BULK-001:** Upload valid CSV file
2. **TC-ADMIN-BULK-002:** Upload invalid CSV, verify error messages
3. **TC-ADMIN-BULK-003:** Preview data before importing
4. **TC-ADMIN-BULK-004:** Import tours successfully
5. **TC-ADMIN-BULK-005:** Verify imported tours appear in tours list
6. **TC-ADMIN-BULK-006:** Handle duplicate slugs during import

---

## Browser & Device Testing

### Desktop Browsers
Test on the following browsers (latest versions):
- [ ] Google Chrome
- [ ] Mozilla Firefox
- [ ] Safari (macOS)
- [ ] Microsoft Edge
- [ ] Opera

### Mobile Browsers
- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] Firefox (Android)
- [ ] Samsung Internet

### Screen Resolutions
- [ ] 1920x1080 (Desktop)
- [ ] 1366x768 (Laptop)
- [ ] 768x1024 (Tablet - Portrait)
- [ ] 1024x768 (Tablet - Landscape)
- [ ] 375x667 (Mobile - iPhone SE)
- [ ] 414x896 (Mobile - iPhone 11)
- [ ] 360x640 (Mobile - Android)

### Responsive Design Checks
- [ ] Navigation menu converts to hamburger on mobile
- [ ] Images scale appropriately
- [ ] Text is readable without horizontal scrolling
- [ ] Buttons are tap-friendly (minimum 44x44px)
- [ ] Forms are usable on mobile
- [ ] Modals/popups work on small screens
- [ ] Cart and checkout are mobile-friendly

---

## Performance Testing

### Page Load Times
Target: All pages should load in under 3 seconds on 4G connection

- [ ] Homepage load time
- [ ] Tour listing page load time
- [ ] Tour detail page load time
- [ ] Checkout page load time
- [ ] User dashboard load time
- [ ] Admin dashboard load time

### Performance Metrics (Use Lighthouse)
Target scores:
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### Load Testing
- [ ] Test with 10 concurrent users browsing
- [ ] Test with 50 concurrent users browsing
- [ ] Test with 10 concurrent checkout processes
- [ ] Verify no slowdowns or timeouts

### Image Optimization
- [ ] Verify images are compressed
- [ ] Check lazy loading implementation
- [ ] Verify responsive images (different sizes for different screens)

---

## Security Testing

### Authentication & Authorization
- [ ] Password must meet complexity requirements
- [ ] Passwords are hashed (not visible in database)
- [ ] Session timeout after inactivity
- [ ] Cannot access admin pages without admin role
- [ ] Cannot access other users' bookings
- [ ] Cannot modify URL to access unauthorized content

### Input Validation
- [ ] XSS prevention (test with `<script>alert('xss')</script>`)
- [ ] SQL injection prevention (test with `' OR '1'='1`)
- [ ] File upload restrictions (only allowed formats)
- [ ] Maximum file size enforcement
- [ ] Email format validation
- [ ] Phone number format validation

### HTTPS & Cookies
- [ ] All pages use HTTPS
- [ ] Cookies are HTTP-only
- [ ] Cookies have Secure flag
- [ ] Sensitive data not in URL parameters

### Payment Security
- [ ] Stripe processes payments (no card data stored locally)
- [ ] Payment form is on HTTPS
- [ ] No card numbers in logs or database
- [ ] 3D Secure authentication works

---

## Bug Reporting Guidelines

### Bug Report Template

```
Bug ID: [Unique identifier]
Title: [Short, descriptive title]
Severity: [Critical / High / Medium / Low]
Priority: [P1 / P2 / P3 / P4]
Status: [New / In Progress / Fixed / Closed]

Environment:
- URL:
- Browser:
- OS:
- Device:

Steps to Reproduce:
1.
2.
3.

Expected Result:
[What should happen]

Actual Result:
[What actually happened]

Screenshots/Videos:
[Attach if available]

Additional Notes:
[Any other relevant information]
```

### Severity Levels

**Critical (P1):**
- Payment processing fails
- Users cannot complete bookings
- Data loss
- Security vulnerabilities
- Site completely down

**High (P2):**
- Major features not working (search, login, etc.)
- Incorrect pricing calculations
- Email notifications not sent
- Admin panel inaccessible

**Medium (P3):**
- Minor feature issues
- UI/UX problems
- Non-critical validation errors
- Missing translations

**Low (P4):**
- Cosmetic issues
- Typos
- Minor UI inconsistencies
- Enhancement requests

---

## Testing Checklists

### Pre-Launch Checklist

#### Functionality
- [ ] All critical user flows work end-to-end
- [ ] Payment processing tested with all test cards
- [ ] Email notifications are sent
- [ ] PDF tickets generate correctly with QR codes
- [ ] All forms validate correctly
- [ ] All links work (no 404 errors)
- [ ] Search and filters work
- [ ] Admin panel fully functional

#### Content
- [ ] All placeholder text replaced
- [ ] All images have alt text
- [ ] No lorem ipsum text
- [ ] Legal pages complete (Terms, Privacy)
- [ ] FAQ section populated
- [ ] Contact information correct

#### Performance
- [ ] Lighthouse scores meet targets
- [ ] Page load times under 3 seconds
- [ ] Images optimized
- [ ] Caching configured

#### Security
- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] API keys not exposed in frontend
- [ ] Rate limiting configured
- [ ] CORS configured correctly

#### SEO
- [ ] Meta titles and descriptions set
- [ ] Open Graph tags configured
- [ ] Sitemap generated
- [ ] Robots.txt configured
- [ ] Google Analytics/Tag Manager installed

#### Browser & Device
- [ ] Tested on all major browsers
- [ ] Tested on mobile devices
- [ ] Responsive design works
- [ ] No console errors

#### Third-Party Integrations
- [ ] Stripe production keys configured
- [ ] Mailgun sending emails
- [ ] Cloudinary images loading
- [ ] Sentry error tracking active
- [ ] Intercom widget working (if enabled)

---

### Daily Testing Checklist

Quick smoke tests to run daily:

- [ ] Homepage loads correctly
- [ ] User can search for tours
- [ ] User can login
- [ ] User can add tour to cart
- [ ] User can complete a test booking
- [ ] Admin can login
- [ ] Admin can create a tour
- [ ] No critical errors in error logs

---

### Regression Testing Checklist

Run after any major update:

- [ ] All test cases passed
- [ ] No new console errors
- [ ] No broken links
- [ ] Performance hasn't degraded
- [ ] Mobile experience intact
- [ ] Admin functionality works
- [ ] Payment processing works
- [ ] Email notifications sent

---

## Common Issues & Solutions

### Issue: Tours not appearing after creation
**Solution:** Check if tour is published and has valid destination/category

### Issue: Payment fails with valid card
**Solution:** Verify Stripe is in test mode and using test keys

### Issue: Email not received
**Solution:** Check spam folder, verify Mailgun configuration, check email logs

### Issue: Images not loading
**Solution:** Verify Cloudinary configuration, check image URLs

### Issue: Cart doesn't persist
**Solution:** Check browser local storage, clear cache and cookies

### Issue: Admin panel redirect loop
**Solution:** Clear cookies, verify JWT secret is consistent

---

## Test Data

### Sample Destinations
- Rome, Italy
- Paris, France
- Dubai, UAE
- New York, USA
- Tokyo, Japan

### Sample Categories
- City Tours
- Adventure Activities
- Food & Dining
- Museums & Culture
- Water Activities

### Sample Tours
Create at least 20 test tours covering:
- Different price ranges ($10 - $500)
- Different durations (1 hour - 7 days)
- Different destinations
- Different categories
- Featured and non-featured
- With and without booking options
- With and without add-ons

---

## Contact & Support

For questions or issues during testing:
- **Developer:** [Developer Name / Email]
- **Project Manager:** [PM Name / Email]
- **Bug Tracking:** [Jira / Linear / GitHub Issues URL]
- **Documentation:** [Wiki / Confluence URL]

---

## Appendix

### Useful Tools
- **Browser DevTools** - Inspect elements, check console
- **Lighthouse** - Performance auditing
- **WAVE** - Accessibility testing
- **BrowserStack** - Cross-browser testing
- **Postman** - API testing
- **MailHog** - Local email testing

### API Endpoints (for reference)
- Authentication: `/api/auth/*`
- Tours: `/api/tours/*`
- Bookings: `/api/bookings/*`
- Admin: `/api/admin/*`
- Checkout: `/api/checkout`
- Reviews: `/api/reviews/*`

---

**Last Updated:** [Date]
**Version:** 1.0
**Prepared by:** Development Team
