# Cloudflare Image Optimization - Quick Start Guide
**Domain**: preview.egypt-excursionsonline.com
**Zone ID**: 31d54dcc6b58753e7184a2f8d6213a9e

---

## ⚡ Quick Setup (3 Options)

### Option 1: Automated Setup (Recommended)

1. **Get your Cloudflare API Token**:
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use template: "Edit Zone Settings"
   - Select your zone: `preview.egypt-excursionsonline.com`
   - Copy the token

2. **Run the setup script**:
   ```bash
   ./setup-cloudflare-images.sh YOUR_API_TOKEN
   ```

3. **Done!** ✅

---

### Option 2: Manual Setup via Dashboard

1. **Go to Cloudflare Dashboard**:
   https://dash.cloudflare.com/

2. **Select your zone**: `preview.egypt-excursionsonline.com`

3. **Enable Speed → Optimization → Image Optimization**:
   - ☑️ Polish: Lossy
   - ☑️ WebP: On
   - ☑️ AVIF: On (if available on your plan)

4. **Configure Allowed Origins**:
   - Scroll to "Transform Images"
   - Select "Specified origins"
   - Add:
     - `preview.egypt-excursionsonline.com`
     - `www.preview.egypt-excursionsonline.com`

5. **Save changes**

---

### Option 3: API Setup (Manual)

```bash
# Your Zone ID
ZONE_ID="31d54dcc6b58753e7184a2f8d6213a9e"
API_TOKEN="YOUR_API_TOKEN"

# Enable Image Resizing
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/image_resizing" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}'

# Enable Polish (Lossy)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/polish" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"lossy"}'

# Enable WebP
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/webp" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}'

# Configure Allowed Origins
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/transformations" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "value": {
      "allowed_origins": [
        "preview.egypt-excursionsonline.com",
        "www.preview.egypt-excursionsonline.com"
      ]
    }
  }'
```

---

## 🧪 Test Your Setup

### 1. Test Optimized Image URL
```bash
# Your hero image through Cloudflare optimization
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1920,quality=85,format=auto,fit=cover/hero2.jpg
```

### 2. Check WebP Format
```bash
curl -I -H 'Accept: image/webp' \
  https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1920,format=auto/hero2.jpg | grep content-type
```
Expected: `content-type: image/webp`

### 3. Check AVIF Format (if available)
```bash
curl -I -H 'Accept: image/avif' \
  https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1920,format=auto/hero2.jpg | grep content-type
```
Expected: `content-type: image/avif`

### 4. Test Different Sizes
```bash
# Desktop (1920px)
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1920,quality=85,format=auto/hero2.jpg

# Tablet (1080px)
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1080,quality=85,format=auto/hero2.jpg

# Mobile (750px)
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=750,quality=85,format=auto/hero2.jpg
```

---

## 📊 Expected Results

### Before Optimization:
- **hero2.jpg**: 2.2MB (original PNG)
- **Load Time**: ~5 seconds
- **Format**: PNG/JPG

### After Optimization:
- **hero2.jpg**: ~50-80KB (WebP/AVIF)
- **Load Time**: <500ms
- **Format**: WebP or AVIF (automatic)

### Compression Gains:
- **PNG → JPG**: 82% reduction (2.2MB → 392KB)
- **JPG → WebP**: 70% reduction (392KB → ~120KB)
- **WebP → AVIF**: 50% reduction (~120KB → ~60KB)
- **Total Savings**: ~97% (2.2MB → ~60KB)

---

## 🚀 Deploy to Production

### 1. Ensure Environment Variables
Check that `.env.production` has:
```bash
NEXT_PUBLIC_DOMAIN=preview.egypt-excursionsonline.com
CLOUDFLARE_IMAGES=true
```

### 2. Build and Deploy
```bash
# Build for production
npm run build

# Test locally
npm start

# Or deploy to Netlify/Vercel
# Make sure to set environment variables in your hosting dashboard
```

### 3. Verify in Production
Visit: https://preview.egypt-excursionsonline.com

Open DevTools → Network → Img filter → Check:
- ✅ Images load from `/cdn-cgi/image/...`
- ✅ Content-Type is `image/webp` or `image/avif`
- ✅ File sizes are small (50-200KB)
- ✅ Load times are < 1 second

---

## 📈 Monitor Performance

### Cloudflare Analytics
**Dashboard**: https://dash.cloudflare.com/

Navigate to:
- **Analytics** → **Traffic**
- **Speed** → **Image Optimization**

Monitor:
- Total transformations
- Bandwidth saved
- Cache hit rate
- Error rate

### PageSpeed Insights
**Test URL**: https://pagespeed.web.dev/?url=https://preview.egypt-excursionsonline.com

Target Metrics:
- **LCP**: < 2.5s (should be < 1.5s with optimizations)
- **FCP**: < 1.8s (should be < 1.0s)
- **Performance Score**: > 90

---

## 🎯 Image URL Examples for Your Site

### Hero Section Images
```
# Hero 1 (Pyramids)
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1920,quality=85,format=auto,fit=cover/hero2.jpg

# Hero 2 (Nile)
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1920,quality=85,format=auto,fit=cover/hero1.jpg

# Hero 3 (Luxor)
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1920,quality=85,format=auto,fit=cover/hero3.jpg
```

### Tour Card Images
```
# Standard tour card
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=400,height=300,quality=85,format=auto,fit=cover/tours/tour-image.jpg

# Tour detail hero
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=1200,height=600,quality=85,format=auto,fit=cover/tours/tour-hero.jpg
```

### Thumbnails
```
# Small thumbnail (100x100)
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=100,height=100,quality=80,format=auto,fit=cover/thumbnail.jpg

# Medium thumbnail (300x200)
https://preview.egypt-excursionsonline.com/cdn-cgi/image/width=300,height=200,quality=80,format=auto,fit=cover/thumbnail.jpg
```

---

## 🔧 Troubleshooting

### Images Not Loading
**Problem**: 404 or 403 errors on image URLs

**Solution**:
1. Check Cloudflare is proxying your domain (orange cloud in DNS)
2. Verify Image Optimization is enabled in dashboard
3. Check allowed origins configuration
4. Clear Cloudflare cache: Dashboard → Caching → Purge Everything

### Images Still Large
**Problem**: Images are not being compressed

**Solution**:
1. Check if browser supports WebP (use Chrome/Firefox)
2. Verify `format=auto` is in the URL
3. Enable Polish in Cloudflare dashboard
4. Check response headers: `content-type: image/webp`

### Slow First Load
**Problem**: First image load is slow

**Solution**:
- **Expected behavior**: First request generates optimized image (1-2s)
- **Subsequent loads**: Cached at edge (<100ms)
- **Fix**: Pre-warm cache by visiting image URLs after deploy

### 403 Forbidden
**Problem**: Access denied errors

**Solution**:
1. Add your domain to allowed origins in Cloudflare
2. Ensure domain is correctly configured
3. Check Cloudflare firewall rules

---

## ✅ Checklist

Before going live, ensure:

- [ ] Cloudflare Image Optimization enabled in dashboard
- [ ] Allowed origins configured
- [ ] Environment variables set in production
- [ ] Code deployed to production
- [ ] Test image URLs work (check in browser)
- [ ] WebP format is being served (check DevTools)
- [ ] PageSpeed score > 90
- [ ] Hero images load < 1 second
- [ ] Analytics showing transformations

---

## 🎉 You're All Set!

Your site should now have:
- ✅ **Lightning-fast hero images** (<1s load)
- ✅ **97% smaller image files** (2.2MB → ~60KB)
- ✅ **Automatic WebP/AVIF** based on browser
- ✅ **Edge caching** (300+ global locations)
- ✅ **Bandwidth savings** (~80% reduction)

**Next Steps**: Monitor Cloudflare analytics and enjoy the speed boost! 🚀

---

**Need Help?**
- Full Documentation: See [CLOUDFLARE_IMAGE_SETUP.md](CLOUDFLARE_IMAGE_SETUP.md)
- Cloudflare Docs: https://developers.cloudflare.com/images/
- Support: support@cloudflare.com (for paid plans)
