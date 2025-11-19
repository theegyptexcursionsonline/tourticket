# Netlify Deployment Setup Guide

## Environment Variables

To deploy this application on Netlify, you need to configure all environment variables in your Netlify dashboard.

### 1. Go to Netlify Dashboard
- Navigate to **Site settings** → **Environment variables**
- Add all variables from your `.env` file

### 2. Required Environment Variables

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_mailgun_domain
MAILGUN_FROM_EMAIL=noreply@yourdomain.com

# Algolia Search
NEXT_PUBLIC_ALGOLIA_APP_ID=your_algolia_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=your_algolia_search_api_key
ALGOLIA_ADMIN_API_KEY=your_algolia_admin_api_key
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=tours

# Google Maps (IMPORTANT!)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Application URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com
BASE_URL=https://yourdomain.com

# Admin
ADMIN_USERNAME=admin@yourcompany.com
ADMIN_PASSWORD=your_secure_password
ADMIN_NOTIFICATION_EMAIL=admin@yourcompany.com
```

### 3. Bypass Secrets Scanning

Netlify's secrets scanner may detect public API keys (like Google Maps, Algolia) as potential security risks. To allow these legitimate public keys:

#### Option 1: Add Specific Value to Allow List (Recommended)

Add this environment variable in Netlify:

```env
SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES=***REMOVED***
```

Replace with your actual Google Maps API key if different.

#### Option 2: Disable Smart Detection (Not Recommended)

If you want to completely disable secrets scanning (not recommended for production):

```env
SECRETS_SCAN_SMART_DETECTION_ENABLED=false
```

⚠️ **Note:** Only use Option 2 if you're certain all your secrets are properly secured via environment variables and not hardcoded.

## Build Settings

### Build Command
```bash
npm run build
```

### Publish Directory
```bash
.next
```

### Node Version
```bash
20.x
```

## Google Maps API Key Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Maps Embed API**
3. Create an API key
4. Restrict the key to your domain(s):
   - Add your Netlify domain (e.g., `yourdomain.netlify.app`)
   - Add your custom domain if you have one
5. Add the key to Netlify environment variables as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Troubleshooting

### "Secrets scanning detected secrets in build"

This means Netlify detected what it thinks is a secret in your build output. Common causes:

1. **Public API keys in client code** - This is normal for keys like Google Maps or Algolia search keys. Add them to `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES`.

2. **Hardcoded credentials** - Check your code for any hardcoded API keys and move them to environment variables.

3. **Test/demo keys** - Remove any hardcoded test keys from your codebase.

### Build failing with "Module not found"

Make sure all dependencies are listed in `package.json` and not just installed locally.

### Environment variables not loading

- Double-check spelling in Netlify dashboard
- Make sure there are no extra spaces
- Redeploy after adding new variables

## Post-Deployment Checklist

- [ ] All environment variables added to Netlify
- [ ] Google Maps API key configured and restricted
- [ ] Stripe webhook configured to point to your Netlify URL
- [ ] MongoDB connection string updated for production
- [ ] Admin credentials changed from defaults
- [ ] Algolia indices synced
- [ ] Test checkout flow end-to-end
- [ ] Verify email notifications are working
- [ ] Check that QR codes in booking emails work

## Support

For deployment issues, check:
- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- Project README.md

