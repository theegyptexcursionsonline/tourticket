# 🚀 Website Performance Optimization Guide

## Current Problem
Your site is slow because:
- ❌ Client-side data fetching on every page load
- ❌ Multiple database queries per request
- ❌ No caching layer
- ❌ No static generation
- ❌ Missing database indexes

## Solutions (Ranked by Impact)

---

## 🎯 Phase 1: Quick Wins (Do These First)

### 1. Enable ISR (Incremental Static Regeneration) ⚡

**Impact**: 10x faster page loads
**Time**: 15 minutes
**Difficulty**: Easy

Replace your current `app/page.tsx` with the new server component:

```tsx
// app/page.tsx
export { default } from './HomePageServer';
```

This will:
- Pre-render the page at build time
- Serve static HTML instantly
- Revalidate every 60 seconds in the background
- Database only hit once per minute instead of every request

**Result**: Page loads in <200ms instead of 2-3 seconds

---

### 2. Add Database Indexes 📊

**Impact**: 5-10x faster queries
**Time**: 10 minutes
**Difficulty**: Easy

Add these indexes to your MongoDB collections:

```javascript
// Run in MongoDB shell or add to your models

// Tours collection
db.tours.createIndex({ isPublished: 1, isFeatured: 1 });
db.tours.createIndex({ destination: 1, isPublished: 1 });
db.tours.createIndex({ slug: 1 });
db.tours.createIndex({ createdAt: -1 });

// Destinations collection
db.destinations.createIndex({ slug: 1 });
db.destinations.createIndex({ isPublished: 1 });

// Categories collection
db.categories.createIndex({ slug: 1 });
db.categories.createIndex({ isPublished: 1 });
```

Or add to your Mongoose models:

```typescript
// In Tour model
tourSchema.index({ isPublished: 1, isFeatured: 1 });
tourSchema.index({ destination: 1, isPublished: 1 });
tourSchema.index({ slug: 1 }, { unique: true });
```

**Result**: Queries run 5-10x faster

---

### 3. Optimize Database Queries 🔍

**Impact**: 3-5x faster queries
**Time**: 5 minutes
**Difficulty**: Easy

Current queries select ALL fields. Optimize by selecting only needed fields:

```typescript
// ❌ Bad - Fetches everything
const tours = await Tour.find({}).populate('destination').lean();

// ✅ Good - Only fetches needed fields
const tours = await Tour.find({ isPublished: true })
  .select('title slug image discountPrice duration rating')
  .populate('destination', 'name')
  .lean();
```

**Result**: 50-70% less data transferred

---

### 4. Enable MongoDB Connection Pooling 💾

**Impact**: 2-3x faster
**Time**: 2 minutes
**Difficulty**: Easy

Update your `lib/dbConnect.ts`:

```typescript
const options = {
  maxPoolSize: 10,  // Maintain up to 10 connections
  minPoolSize: 2,   // Maintain at least 2 connections
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
};

await mongoose.connect(MONGODB_URI!, options);
```

**Result**: Reuses connections instead of creating new ones

---

## 🚀 Phase 2: Caching Layer (Do Next)

### 5. Add Redis Caching (Best Option) 🔴

**Impact**: 50-100x faster
**Time**: 30 minutes
**Difficulty**: Medium

```bash
# Install Redis client
npm install ioredis
```

```typescript
// lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function getCached<T>(key: string, fetcher: () => Promise<T>, ttl = 60): Promise<T> {
  // Try to get from cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}

export { redis };
```

Usage:

```typescript
// In your data fetching functions
const destinations = await getCached(
  'homepage:destinations',
  async () => await Destination.find({ isPublished: true }).lean(),
  300 // 5 minutes
);
```

**Where to host Redis**:
- **Upstash** (Free tier, serverless): https://upstash.com
- **Redis Cloud** (Free tier): https://redis.com
- **Vercel KV** (Built-in for Vercel): https://vercel.com/storage/kv

**Result**: Most requests served from memory, not database

---

### 6. Add In-Memory Caching (Free Alternative) 💭

**Impact**: 10-20x faster
**Time**: 10 minutes
**Difficulty**: Easy

```typescript
// lib/cache.ts
const cache = new Map<string, { data: any; expires: number }>();

export function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 60000 // 60 seconds
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expires > now) {
    return Promise.resolve(cached.data);
  }

  return fetcher().then((data) => {
    cache.set(key, { data, expires: now + ttl });
    return data;
  });
}

// Clear cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expires < now) {
      cache.delete(key);
    }
  }
}, 60000);
```

**Result**: Data cached in server memory (Note: Won't work on serverless platforms like Vercel)

---

## ⚡ Phase 3: Advanced Optimizations

### 7. Image Optimization 🖼️

All images should use Next.js Image component (already done in new components):

```tsx
<Image
  src={tour.image}
  alt={tour.title}
  fill
  className="object-cover"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
  priority={false} // Set true only for above-the-fold images
/>
```

**Result**: Images automatically optimized, lazy-loaded, and served in WebP

---

### 8. Code Splitting & Dynamic Imports 📦

For heavy components not immediately needed:

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy components
const AIAgentWidget = dynamic(() => import('@/components/AIAgentWidget'), {
  ssr: false,
  loading: () => null
});

const BookingSidebar = dynamic(() => import('@/components/BookingSidebar'), {
  ssr: false
});
```

**Result**: Smaller initial JavaScript bundle

---

### 9. API Route Caching 🌐

Add caching headers to API routes:

```typescript
// app/api/destinations/route.ts
export async function GET() {
  const destinations = await getDestinations();

  return NextResponse.json(
    { success: true, data: destinations },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    }
  );
}
```

---

### 10. Deploy to Edge (Vercel) 🌍

Add to affected routes:

```typescript
export const runtime = 'edge';
```

**Result**: Content served from nearest edge location

---

## 📊 Expected Performance Gains

| Optimization | Current | After | Improvement |
|-------------|---------|-------|-------------|
| Page Load | 2-3s | 200-300ms | **10x faster** |
| Database Queries | 500-1000ms | 50-100ms | **5-10x faster** |
| API Responses | 1-2s | 50-100ms | **10-20x faster** |
| Time to Interactive | 3-4s | 500ms | **6-8x faster** |

---

## 🎯 Implementation Priority

### Week 1 (Immediate):
1. ✅ Enable ISR (use HomePageServer component)
2. ✅ Add database indexes
3. ✅ Optimize queries with select()
4. ✅ Enable connection pooling

**Expected gain**: 5-10x faster

### Week 2 (High Impact):
5. Add Redis caching (Upstash free tier)
6. Cache API routes
7. Add dynamic imports for heavy components

**Expected gain**: 20-50x faster

### Week 3 (Polish):
8. Review all images using Next/Image
9. Add edge runtime where possible
10. Monitor with Vercel Analytics

---

## 🔧 How to Implement ISR Right Now

### Step 1: Replace homepage

```bash
# Rename current page.tsx
mv app/page.tsx app/page-old.tsx

# Use new server component
echo "export { default } from './HomePageServer';" > app/page.tsx
```

### Step 2: Deploy

```bash
npm run build
npm run start
```

### Step 3: Test

Open your homepage - it should load instantly!

---

## 📈 Monitoring Performance

### Use Vercel Analytics (if deployed on Vercel):
```bash
npm install @vercel/analytics
```

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Use Lighthouse:
```bash
# Chrome DevTools > Lighthouse > Generate Report
```

Target scores:
- Performance: 90+
- First Contentful Paint: <1s
- Time to Interactive: <2s

---

## 🚨 Common Mistakes to Avoid

1. ❌ Don't fetch data in client components
2. ❌ Don't query database without indexes
3. ❌ Don't select all fields when you only need a few
4. ❌ Don't create new DB connections on every request
5. ❌ Don't forget to add proper caching headers

---

## 🎓 How MMT and Big Sites Do It

1. **Static Site Generation**: Pre-render everything possible
2. **CDN**: Serve from edge locations (Cloudflare, Vercel Edge)
3. **Redis**: Cache ALL database queries
4. **Database Replicas**: Read from replicas, write to primary
5. **Microservices**: Separate services for tours, destinations, etc.
6. **GraphQL**: Fetch only needed data
7. **Service Workers**: Offline caching
8. **Lazy Loading**: Load images/components on scroll

---

## 🎉 Summary

**Quick Win (Do Today)**:
```bash
# Replace homepage with ISR version
echo "export { default } from './HomePageServer';" > app/page.tsx
npm run build
```

**Result**: Homepage will load **10x faster** immediately!

Then add Redis caching and database indexes for even more speed.

---

## 📞 Need Help?

1. Check Next.js docs: https://nextjs.org/docs/app/building-your-application/data-fetching
2. MongoDB indexes: https://www.mongodb.com/docs/manual/indexes/
3. Redis caching: https://upstash.com/docs/redis/quickstart

Good luck! 🚀
