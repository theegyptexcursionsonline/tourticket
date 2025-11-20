# Testing Guide - Next.js Performance Improvements

## Quick Test (Development Mode)

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test Homepage Cards
1. Open `http://localhost:3000`
2. Open DevTools → Network tab
3. Hover over any tour card (day trips, featured tours)
4. Look for prefetch requests in Network tab
5. Click the card
6. **Page should load instantly!** ⚡

**Note:** In development mode, you'll see some slower loads due to hot reloading. For true performance, test in production mode.

---

## Complete Test (Production Mode) - RECOMMENDED ✅

This is the **true test** of performance improvements.

### Step 1: Build the Application
```bash
npm run build
```

**What to Look For:**
- You should see output showing static page generation
- Look for lines like:
  ```
  ○ /tour/[slug]                    60s    [ISR]
  ● /tour/pyramids-tour            60s    [SSG]
  ● /tour/nile-cruise              60s    [SSG]
  ... (50+ pre-generated tours)
  ```

**Symbols:**
- `●` (Filled) = Static (SSG) - Pre-generated at build time ⚡
- `○` (Empty) = ISR - Generated on-demand, then cached
- `λ` (Lambda) = Server-side only (should be minimal)

### Step 2: Start Production Server
```bash
npm start
```

### Step 3: Test Performance

#### Test 1: Homepage Card Clicks
1. Navigate to `http://localhost:3000`
2. Open Chrome DevTools:
   - Press `F12` or `Cmd+Option+I` (Mac)
   - Go to **Network** tab
   - Check "Disable cache" is **OFF**
3. Hover over a **Day Trip** card
4. Watch Network tab - you should see prefetch requests
5. Click the card
6. **Expected:** Page appears in <100ms! 🚀

#### Test 2: Direct Tour URL
1. Open a new tab
2. Navigate to any tour directly: `http://localhost:3000/tour/pyramids-tour`
3. **Expected:** Page loads instantly!

#### Test 3: Second Visit (Cache Test)
1. Click a tour card
2. Hit browser back button
3. Click the **same** card again
4. **Expected:** Instant load from cache (<50ms)

#### Test 4: Prefetch Verification
1. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Reload homepage
3. Open Network tab
4. Hover (don't click!) over 3-4 different tour cards
5. You should see multiple requests in Network tab with:
   - **Type:** `prefetch`
   - **Status:** `200`
   - **Size:** `(prefetch cache)`
6. Now click any of those cards
7. **Expected:** Instant load! The page was already prefetched

---

## Performance Metrics to Check

### Chrome DevTools Performance

1. Open DevTools → **Performance** tab
2. Click record
3. Click a tour card
4. Stop recording
5. Look at timeline:
   - **Before Fix:** 2000-3000ms total
   - **After Fix:** <100ms total ⚡

### Lighthouse Audit

1. Open DevTools → **Lighthouse** tab
2. Select "Performance" category
3. Click "Analyze page load"
4. **Expected Scores:**
   - Performance: 90-100 ✅
   - First Contentful Paint: <1s
   - Largest Contentful Paint: <2.5s
   - Time to Interactive: <3s

---

## What You Should Observe

### ✅ Successful Test Results:

1. **Instant Page Loads**
   - Cards click → page appears immediately
   - No loading spinners or delays

2. **Prefetch Working**
   - Network tab shows prefetch requests on hover
   - Prefetched pages load from cache

3. **ISR Working**
   - First load: Fast (from static generation)
   - Subsequent loads: Instant (from cache)
   - Content still updates (revalidation)

4. **Build Output**
   - 50+ tour pages shown as static
   - All destination pages static
   - Homepage static

### ❌ If Something's Wrong:

1. **Pages Still Slow?**
   - Make sure you ran `npm run build` first
   - Make sure you're using `npm start` (not `npm run dev`)
   - Clear browser cache and try again

2. **No Prefetch Requests?**
   - Check that you're in production mode
   - Prefetch only works in production
   - Dev mode has different behavior

3. **Build Errors?**
   - Check database connection
   - Make sure MongoDB is running
   - Check console for errors

---

## Visual Comparison

### Before (Broken) 🐌
```
User Action Timeline:
[Hover Card] → Nothing happens
[Click Card] → Loading... (2-3 seconds) → Page Appears
```

### After (Fixed) ⚡
```
User Action Timeline:
[Hover Card] → Prefetch starts (silent, in background)
[Click Card] → Page Appears INSTANTLY! (<100ms)
```

---

## Network Tab Analysis

### What Good Prefetch Looks Like:

```
Name                          Type       Status  Size
tour-pyramids.json           prefetch   200     (prefetch cache)
tour-nile-cruise.json        prefetch   200     (prefetch cache)
pyramids-tour                document   200     (disk cache)
```

### What to Look For:
- ✅ `prefetch` type appears
- ✅ `(prefetch cache)` or `(disk cache)` in size column
- ✅ Multiple prefetch requests on hover
- ✅ Instant load from cache on click

---

## Troubleshooting

### Issue: "Module not found" errors during build
**Solution:** Run `npm install` to ensure all dependencies are installed

### Issue: Database connection timeout during build
**Solution:** 
- Make sure MongoDB is running
- Check your `.env.local` file has correct `MONGODB_URI`
- Build will continue with fallback (pages generated on-demand)

### Issue: No performance improvement
**Solution:**
1. Confirm you're testing in **production mode** (`npm start`)
2. Clear browser cache completely
3. Check Network tab for prefetch requests
4. Verify build output shows static pages

### Issue: Pages show stale data
**Solution:** Wait 60 seconds for revalidation, or clear cache

---

## Expected Build Output

```bash
Route (app)                                 Size     First Load JS
┌ ○ /                                      1.2 kB         90 kB
├ ○ /tour/[slug]                           2.5 kB         95 kB
│ ├ /tour/pyramids-tour                    [ISR: 60s]
│ ├ /tour/nile-cruise                      [ISR: 60s]
│ └ [+48 more paths]                       [ISR: 60s]
├ ○ /destinations/[slug]                   3.1 kB         98 kB
│ ├ /destinations/cairo                    [ISR: 60s]
│ ├ /destinations/luxor                    [ISR: 60s]
│ └ [+8 more paths]                        [ISR: 60s]

○  (Static)   prerendered as static content
●  (SSG)      automatically generated as static HTML + JSON
λ  (Server)   server-side renders at runtime
```

---

## Success Criteria ✅

Your optimization is working if:

1. ✅ Build shows 50+ static tour pages
2. ✅ Network tab shows prefetch requests on hover
3. ✅ Tour pages load in <100ms after click
4. ✅ No flash of loading state
5. ✅ Lighthouse Performance score >90
6. ✅ Second visits even faster (<50ms)

---

## Next Steps After Verification

Once you confirm everything works:

1. **Deploy to Production**
   - Your hosting platform will run the build automatically
   - Static pages will be served via CDN
   - Even faster than local testing!

2. **Monitor Performance**
   - Use Google Analytics to track page load times
   - Monitor Core Web Vitals
   - Check for any slow pages

3. **Optimize Further** (Optional)
   - Increase static params from 50 to 100 if needed
   - Adjust revalidation time based on content update frequency
   - Add more aggressive caching if appropriate

---

## Questions?

- **Q: Why is dev mode still slow?**
  - A: Dev mode prioritizes hot reloading over performance. Always test in production mode.

- **Q: Can I increase the number of pre-generated pages?**
  - A: Yes! Change `.limit(50)` to `.limit(100)` in `generateStaticParams` functions.

- **Q: What if I add a new tour?**
  - A: It will be generated on first request, then cached. Or rebuild to pre-generate it.

- **Q: How often are pages revalidated?**
  - A: Every 60 seconds. Adjust `revalidate` value if needed.

---

**Happy Testing! 🚀**

