# Contact Form Security Setup Guide

This guide explains how to set up spam protection for the contact form. The implementation includes multiple layers of security:

## Security Measures Implemented

### 1. Google reCAPTCHA v3 (Invisible)
- Analyzes user behavior to detect bots
- No user interaction required (invisible)
- Provides a score-based risk analysis

### 2. Honeypot Field
- Hidden field that only bots will fill
- Simple but effective against basic spam bots

### 3. Rate Limiting
- Limits submissions to 3 per hour per IP address
- Prevents mass spam attacks

### 4. Timing Checks
- Rejects submissions faster than 3 seconds
- Detects automated submissions

## Setup Instructions

### Step 1: Get Google reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" or "+" to register a new site
3. Fill in the form:
   - **Label**: `Egypt Excursions Online Contact Form` (or any name you prefer)
   - **reCAPTCHA type**: Select **reCAPTCHA v3**
   - **Domains**: Add your domain(s):
     - `egypt-excursionsonline.com`
     - `localhost` (for development)
   - Accept the reCAPTCHA Terms of Service
4. Click **Submit**
5. You'll receive two keys:
   - **Site Key** (starts with `6L...`) - This is public
   - **Secret Key** (starts with `6L...`) - Keep this private!

### Step 2: Add Environment Variables

Add these variables to your `.env` file:

```bash
# Google reCAPTCHA v3 (for contact form spam protection)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

**Important:**
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` must start with `NEXT_PUBLIC_` to be available in the browser
- `RECAPTCHA_SECRET_KEY` should never be exposed to the client

### Step 3: Restart Your Development Server

After adding the environment variables:

```bash
pnpm dev
```

### Step 4: Test the Contact Form

1. Visit your contact page: `http://localhost:3000/contact`
2. Fill out the form normally - it should work fine
3. Try submitting too quickly (less than 3 seconds) - should be blocked
4. Try submitting multiple times (more than 3 in an hour) - should be rate limited
5. Check the browser console for any reCAPTCHA errors

## How It Works

### Client-Side Protection

1. **Form Load Time Tracking**: Records when the form loads
2. **Honeypot Check**: Verifies the hidden "website" field is empty
3. **Timing Validation**: Ensures at least 3 seconds passed since page load
4. **reCAPTCHA Token**: Obtains an invisible token when form is submitted

### Server-Side Validation

1. **Basic Validation**: Checks required fields and email format
2. **Rate Limiting**: Tracks IP addresses and limits submissions per hour
3. **Timing Check**: Server-side validation of submission time
4. **reCAPTCHA Verification**: Verifies token with Google's API
5. **Score Check**: Only accepts scores >= 0.5 (likely human)

## Testing reCAPTCHA

### Development Testing

reCAPTCHA works in localhost, but you need to add `localhost` to your allowed domains in the reCAPTCHA console.

### Production Testing

After deploying, test with:
- Normal human submission (should work)
- Automated tools like curl or Postman (should be blocked)
- Browser automation tools (should be detected)

### reCAPTCHA Scores

- **0.0 to 0.3**: Very likely a bot
- **0.3 to 0.6**: Suspicious
- **0.7 to 1.0**: Very likely human

The current threshold is set to **0.5**, which balances security and user experience.

## Monitoring & Adjusting

### View reCAPTCHA Analytics

1. Go to [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Select your site
3. View analytics to see:
   - Number of requests
   - Score distribution
   - Blocked attempts

### Adjusting Security Settings

#### Change Score Threshold

In [app/api/contact/route.ts:28](/app/api/contact/route.ts#L28):
```typescript
return data.success && data.score >= 0.5; // Adjust this value
```

- Lower (0.3): More lenient, fewer false positives
- Higher (0.7): Stricter, may block some legitimate users

#### Change Rate Limit

In [app/api/contact/route.ts:7-8](/app/api/contact/route.ts#L7-L8):
```typescript
const MAX_SUBMISSIONS_PER_HOUR = 3; // Change this value
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // Change time window
```

#### Change Timing Threshold

In [app/contact/ContactClientPage.tsx:149](/app/contact/ContactClientPage.tsx#L149) and [app/api/contact/route.ts:100](/app/api/contact/route.ts#L100):
```typescript
if (timeSinceLoad < 3000) { // Change from 3000ms (3 seconds)
```

## Troubleshooting

### reCAPTCHA not loading

**Problem**: Form submits without reCAPTCHA verification
**Solution**:
- Check that `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set
- Verify the key is correct
- Check browser console for errors

### "Security verification failed" errors

**Problem**: Legitimate users getting blocked
**Solution**:
- Check reCAPTCHA analytics for score distribution
- Lower the score threshold (currently 0.5)
- Verify `RECAPTCHA_SECRET_KEY` is correct

### Rate limiting too strict

**Problem**: Users can't resubmit after corrections
**Solution**:
- Increase `MAX_SUBMISSIONS_PER_HOUR` (currently 3)
- Decrease `RATE_LIMIT_WINDOW` (currently 1 hour)

### Still getting spam

**Problem**: Spam messages getting through
**Solution**:
1. Check reCAPTCHA is properly configured
2. Lower the score threshold requirement
3. Add additional validation rules
4. Consider adding a confirmation email requirement
5. Add content filtering for common spam keywords

## Production Considerations

### Redis for Rate Limiting

The current implementation uses in-memory rate limiting, which resets when the server restarts. For production, consider using Redis:

```typescript
// Example with Redis
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `contact_form:${ip}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour
  }

  return count <= MAX_SUBMISSIONS_PER_HOUR;
}
```

### Content Filtering

Add keyword filtering for common spam:

```typescript
const spamKeywords = ['viagra', 'casino', 'lottery', 'winner'];
const containsSpam = spamKeywords.some(keyword =>
  message.toLowerCase().includes(keyword)
);

if (containsSpam) {
  return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
}
```

### Database Logging

Log all submissions (including blocked ones) for analysis:

```typescript
await ContactSubmission.create({
  name,
  email,
  message,
  ip: clientIP,
  recaptchaScore: data.score,
  blocked: false,
  timestamp: new Date(),
});
```

## Additional Resources

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Best Practices for reCAPTCHA](https://developers.google.com/recaptcha/docs/v3#best_practices)

## Support

If you encounter issues or need to adjust security settings, refer to:
- This documentation
- reCAPTCHA analytics dashboard
- Server logs for blocked submissions
