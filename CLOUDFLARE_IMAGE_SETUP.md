# Cloudflare Image Optimization Setup Guide

## Overview
This guide will help you set up Cloudflare Image Optimization for automatic WebP/AVIF conversion, resizing, and edge caching of all images on your Next.js site.

## Benefits
- ✅ **80-90% smaller images** with WebP/AVIF format
- ✅ **Edge caching** - images served from 300+ data centers worldwide
- ✅ **Automatic format detection** - serves best format based on browser
- ✅ **Lazy loading optimization** - images load only when needed
- ✅ **No bandwidth costs** for image transformations
- ✅ **Lightning fast hero images** - instant load times

## Prerequisites
- Cloudflare account with your domain
- Your Zone ID: `31d54dcc6b58753e7184a2f8d6213a9e`
- Production domain set up on Cloudflare

---

## Step 1: Enable Cloudflare Image Optimization

### Via Cloudflare Dashboard:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your zone (domain)
3. Navigate to **Speed** → **Optimization** → **Image Optimization**
4. Click **Enable Image Optimization**
5. Configure settings:
   - ☑️ **Polish**: Lossless or Lossy (recommended: Lossy for best compression)
   - ☑️ **WebP**: Enabled
   - ☑️ **AVIF**: Enabled (if available on your plan)
   - ☑️ **Preserve Content Credentials**: Enabled (optional)

### Via Cloudflare API:
```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/31d54dcc6b58753e7184a2f8d6213a9e/settings/image_resizing" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}'
```

---

## Step 2: Configure Allowed Origins

### Option A: Allow Specified Origins (Recommended for Security)
1. In Cloudflare Dashboard → **Image Optimization**
2. Select **"Specified origins"**
3. Add your domain(s):
   ```
   yourdomain.com
   www.yourdomain.com
   cdn.yourdomain.com
   ```

### Option B: Allow Any Origin (Less Secure)
- Select **"Any origin"** if you need to transform images from external sources
- ⚠️ **Warning**: This allows anyone to use your zone for image transformations

### Via API:
```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/31d54dcc6b58753e7184a2f8d6213a9e/settings/transformations" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "value": {
      "allowed_origins": ["yourdomain.com", "www.yourdomain.com"]
    }
  }'
```

---

## Step 3: Update Environment Variables

Add these to your `.env.production` file:

```bash
# Production domain (without protocol)
NEXT_PUBLIC_DOMAIN=yourdomain.com

# Enable Cloudflare image optimization
CLOUDFLARE_IMAGES=true

# Or if using full URL:
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

---

## Step 4: Test the Setup

### Local Development Test
Images will use Next.js default optimization (works without Cloudflare):
```bash
npm run dev
# Visit http://localhost:3035
```

### Production Test
After deploying to production:

1. **Check Image URLs**:
   Open your site and inspect an image. The URL should look like:
   ```
   https://yourdomain.com/cdn-cgi/image/width=1920,quality=85,format=auto,fit=cover/hero2.jpg
   ```

2. **Verify Format**:
   - In Chrome DevTools → Network tab → Filter by "Img"
   - Check the `Content-Type` header should be `image/webp` or `image/avif`

3. **Test Performance**:
   - Run [PageSpeed Insights](https://pagespeed.web.dev/)
   - Your hero image should load in < 1 second
   - LCP (Largest Contentful Paint) should be < 2.5s

---

## Step 5: Deploy to Production

```bash
# Build for production
npm run build

# Test production build locally
npm start

# Deploy to your hosting (Vercel, Netlify, etc.)
# Make sure environment variables are set
```

---

## Cloudflare Image URL Format

### Basic Format:
```
https://yourdomain.com/cdn-cgi/image/<options>/<image-path>
```

### Available Options:
- `width=XXX` - Resize to width
- `height=XXX` - Resize to height
- `quality=85` - JPEG/WebP quality (1-100)
- `format=auto` - Auto WebP/AVIF based on browser
- `fit=cover` - Crop to exact dimensions
- `fit=contain` - Resize within dimensions
- `fit=scale-down` - Only downscale
- `onerror=redirect` - Fallback to original on error
- `sharpen=1` - Apply sharpening
- `blur=10` - Apply blur effect

### Example URLs:
```
# Hero image optimized
https://yourdomain.com/cdn-cgi/image/width=1920,quality=85,format=auto,fit=cover/hero2.jpg

# Thumbnail
https://yourdomain.com/cdn-cgi/image/width=300,height=200,quality=80,format=auto,fit=cover/tour-image.jpg

# Mobile optimized
https://yourdomain.com/cdn-cgi/image/width=750,quality=85,format=auto,fit=scale-down/hero2.jpg
```

---

## Troubleshooting

### Images Not Loading
1. Check Cloudflare dashboard → Analytics → Image Optimization
2. Verify your domain is correctly proxied (orange cloud)
3. Check allowed origins configuration
4. Ensure `NEXT_PUBLIC_DOMAIN` is set correctly

### Images Still Large
1. Verify browser supports WebP (check DevTools → Network → Type)
2. Check if Polish is enabled in Cloudflare
3. Ensure `format=auto` is in the URL
4. Clear Cloudflare cache: Dashboard → Caching → Purge Everything

### 403 Forbidden Errors
- Check allowed origins in Cloudflare Image settings
- Verify your domain is added to the allowed list

### Slow First Load
- First request generates the optimized image (takes 1-2s)
- Subsequent requests are cached at the edge (< 100ms)
- Consider pre-warming cache for critical images

---

## Monitoring & Analytics

### Check Image Optimization Stats:
1. Cloudflare Dashboard → Analytics → Image Optimization
2. View:
   - Total transformations
   - Bandwidth saved
   - Cache hit rate
   - Error rate

### Performance Metrics to Track:
- **LCP (Largest Contentful Paint)**: Should be < 2.5s
- **Image Load Time**: Hero images < 1s
- **Bandwidth Savings**: 60-80% reduction
- **Cache Hit Rate**: Should be > 95%

---

## Cost Considerations

### Cloudflare Plans:
- **Free Plan**:
  - ❌ No Image Optimization

- **Pro Plan ($20/month)**:
  - ✅ Polish (lossless/lossy)
  - ✅ WebP
  - ❌ No AVIF
  - ❌ No resizing

- **Business Plan ($200/month)**:
  - ✅ Polish
  - ✅ WebP + AVIF
  - ✅ Image Resizing
  - ✅ Custom transformations
  - ✅ 100% cache hit rate

- **Enterprise Plan**:
  - ✅ Everything + priority support

### Alternative (if on Free Plan):
Use Next.js built-in optimization (already configured):
- Set `CLOUDFLARE_IMAGES=false` in env
- Images will be optimized by Next.js
- Slightly slower but still good performance

---

## Migration Checklist

- [ ] Enable Cloudflare Image Optimization in dashboard
- [ ] Configure allowed origins
- [ ] Set environment variables in production
- [ ] Deploy updated code
- [ ] Test image URLs in production
- [ ] Verify WebP/AVIF format in DevTools
- [ ] Run PageSpeed Insights test
- [ ] Monitor analytics for 24 hours
- [ ] Purge Cloudflare cache if needed

---

## Additional Resources

- [Cloudflare Image Optimization Docs](https://developers.cloudflare.com/images/)
- [Transform Images via URL](https://developers.cloudflare.com/images/transform-images/transform-via-url/)
- [Next.js Image Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing/images)

---

## Support

If you encounter issues:
1. Check Cloudflare status: https://www.cloudflarestatus.com/
2. Review Cloudflare logs in dashboard
3. Contact Cloudflare support (Business+ plans)
4. Refer to Next.js Image documentation

---

**Status**: ✅ Configuration Complete
**Next Step**: Deploy to production and test!
