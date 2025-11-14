# Cloudflare SSR Optimization Guide

## Problem
SSR pages load fast on Netlify's direct domain but slow on Cloudflare-proxied custom domain.

## Root Causes
1. ❌ Incorrect Cache-Control headers caching HTML for 1 year
2. ❌ Cloudflare's default caching interfering with Next.js ISR
3. ❌ Missing CDN-specific cache directives

## Solutions Implemented

### 1. Fixed Cache-Control Headers (next.config.ts)
- ✅ Removed aggressive caching from all routes
- ✅ Added proper ISR caching: `s-maxage=60, stale-while-revalidate=3600`
- ✅ Added CDN-Cache-Control for Cloudflare compatibility
- ✅ Kept long-term caching for static assets only

### 2. Cloudflare Settings (Configure in Cloudflare Dashboard)

#### A. Caching Settings
Navigate to **Caching > Configuration** in Cloudflare Dashboard:

1. **Browser Cache TTL**: Set to "Respect Existing Headers"
2. **Caching Level**: Set to "Standard"
3. **Always Online**: Enable (for better performance)

#### B. Page Rules (Critical!)
Navigate to **Rules > Page Rules** and create these rules:

**Rule 1: Bypass Cache for HTML Pages**
```
URL Pattern: yourdomain.com/*
Settings:
  - Cache Level: Bypass
  - Browser Cache TTL: Respect Existing Headers
```
OR (better for ISR):
```
URL Pattern: yourdomain.com/
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 60 seconds
  - Browser Cache TTL: Respect Existing Headers
```

**Rule 2: Cache Static Assets Aggressively**
```
URL Pattern: yourdomain.com/_next/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
```

#### C. Speed Optimizations
Navigate to **Speed > Optimization**:

1. **Auto Minify**:
   - ✅ JavaScript
   - ✅ CSS
   - ❌ HTML (disable for Next.js)

2. **Rocket Loader**: ❌ Disable (conflicts with Next.js)

3. **Mirage**: ✅ Enable (image optimization)

4. **Polish**: Select "Lossless" or "Lossy" for image compression

5. **Early Hints**: ✅ Enable

#### D. Network Settings
Navigate to **Network**:

1. **HTTP/3 (with QUIC)**: ✅ Enable
2. **HTTP/2**: ✅ Enable
3. **WebSockets**: ✅ Enable
4. **gRPC**: ✅ Enable

#### E. SSL/TLS Settings
Navigate to **SSL/TLS**:

1. **Mode**: Full (strict)
2. **Always Use HTTPS**: ✅ Enable
3. **Automatic HTTPS Rewrites**: ✅ Enable

### 3. Recommended Cloudflare Workers (Optional)

If you want more control, create a Cloudflare Worker:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Let Next.js handle caching for HTML pages
  if (url.pathname === '/' || !url.pathname.includes('.')) {
    const response = await fetch(request, {
      cf: {
        cacheTtl: 60,
        cacheEverything: true
      }
    })

    // Add custom headers
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('CF-Cache-Status', response.headers.get('CF-Cache-Status'))

    return newResponse
  }

  // Cache static assets aggressively
  if (url.pathname.startsWith('/_next/static/')) {
    return fetch(request, {
      cf: {
        cacheTtl: 31536000,
        cacheEverything: true
      }
    })
  }

  return fetch(request)
}
```

### 4. Testing & Verification

After deploying changes:

1. **Clear Cloudflare Cache**:
   - Go to Caching > Configuration
   - Click "Purge Everything"

2. **Test Response Headers**:
   ```bash
   # Test your Cloudflare domain
   curl -I https://yourdomain.com/

   # Look for these headers:
   # - Cache-Control: s-maxage=60, stale-while-revalidate=3600
   # - CF-Cache-Status: HIT, MISS, or DYNAMIC
   # - CDN-Cache-Control: max-age=60
   ```

3. **Test ISR Revalidation**:
   - Visit homepage → check CF-Cache-Status (should be MISS first time)
   - Visit again within 60s → should be HIT
   - Wait 60s → should revalidate and serve fresh content

4. **Compare Performance**:
   ```bash
   # Netlify direct
   curl -w "@-" -o /dev/null -s https://your-app.netlify.app/ <<'EOF'
   time_total: %{time_total}s\n
   EOF

   # Cloudflare proxied
   curl -w "@-" -o /dev/null -s https://yourdomain.com/ <<'EOF'
   time_total: %{time_total}s\n
   EOF
   ```

### 5. Additional Optimizations

#### A. Update HomePageServer.tsx ISR
The current revalidation is good (60s), but you might want to adjust based on data freshness needs:

```typescript
// For more frequent updates
export const revalidate = 30;

// For less frequent (better caching)
export const revalidate = 300; // 5 minutes
```

#### B. Add Database Connection Pooling
Your MongoDB connections might be slow. Consider:

```typescript
// lib/dbConnect.ts - add connection pooling options
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

#### C. Enable Cloudflare Argo
If performance is still slow:
- Navigate to **Traffic > Argo Smart Routing**
- Enable Argo ($5/month + $0.10/GB)
- This routes traffic through Cloudflare's fastest paths

## Expected Results

After these changes:
- ✅ Homepage loads in ~1-2s (initial)
- ✅ Cached pages load in <500ms
- ✅ ISR revalidates every 60s
- ✅ Static assets cached for 1 year
- ✅ Consistent performance across both domains

## Monitoring

Use these tools to monitor performance:
1. Cloudflare Analytics → Performance tab
2. Next.js `console.log` timing in getHomePageData()
3. Browser DevTools → Network tab → Check CF-Cache-Status header

## Troubleshooting

**Issue**: Still slow on Cloudflare
- Solution: Check if DNS is proxied (orange cloud icon in DNS settings)
- Verify Page Rules are active and in correct order

**Issue**: Content not updating after 60s
- Solution: Purge Cloudflare cache manually
- Check revalidate value in HomePageServer.tsx

**Issue**: Cloudflare serving stale content
- Solution: Set Cache-Control to `s-maxage=1, stale-while-revalidate=59`
- This forces more frequent CDN checks
