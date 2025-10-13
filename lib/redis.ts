// lib/redis.ts
import Redis from 'ioredis';

let redis: Redis | null = null;

// Initialize Redis connection
if (!redis) {
  const url = process.env.REDIS_URL ?? process.env.REDIS_URI ?? null;

  if (!url) {
    console.warn('⚠️  No REDIS_URL found. Using in-memory cache for development.');
    
    // In-memory fallback for development
    const memoryCache: Record<string, { value: string; expiry?: number }> = {};
    
    redis = {
      get: async (k: string) => {
        const cached = memoryCache[k];
        if (!cached) return null;
        if (cached.expiry && Date.now() > cached.expiry) {
          delete memoryCache[k];
          return null;
        }
        return cached.value;
      },
      set: async (k: string, v: string, mode?: string, duration?: number) => {
        const expiry = mode === 'EX' && duration ? Date.now() + duration * 1000 : undefined;
        memoryCache[k] = { value: v, expiry };
        return 'OK';
      },
      del: async (...keys: string[]) => {
        keys.forEach(k => delete memoryCache[k]);
        return keys.length;
      },
      keys: async (pattern: string) => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return Object.keys(memoryCache).filter(k => regex.test(k));
      },
      flushall: async () => {
        Object.keys(memoryCache).forEach(k => delete memoryCache[k]);
        return 'OK';
      },
    } as unknown as Redis;
  } else {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableAutoPipelining: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redis.on('error', (e) => {
      console.error('❌ Redis error:', e.message);
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('ready', () => {
      console.log('✅ Redis ready');
    });
  }
}

export default redis;

// Cache Helper Functions
export const cacheConfig = {
  // Cache durations in seconds
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 900,           // 15 minutes
  HOUR: 3600,          // 1 hour
  DAY: 86400,          // 24 hours
} as const;

/**
 * Get data from cache or fetch from database
 */
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = cacheConfig.MEDIUM
): Promise<T> {
  try {
    // Try to get from cache
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`✅ Cache HIT: ${key}`);
      return JSON.parse(cached);
    }

    console.log(`❌ Cache MISS: ${key}`);
    
    // Fetch from database
    const data = await fetchFn();
    
    // Store in cache
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
    
    return data;
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error);
    // Fallback to direct fetch if Redis fails
    return fetchFn();
  }
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Invalidated ${keys.length} cache keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error(`Error invalidating cache pattern ${pattern}:`, error);
  }
}

/**
 * Set cache with TTL
 */
export async function setCache(
  key: string,
  data: unknown,
  ttl: number = cacheConfig.MEDIUM
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
    console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
}

/**
 * Delete specific cache key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
    console.log(`🗑️  Deleted cache: ${key}`);
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    await redis.flushall();
    console.log('🗑️  Cleared all cache');
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
}

// Cache key generators
export const cacheKeys = {
  tours: {
    all: () => 'tours:all',
    single: (id: string) => `tours:single:${id}`,
    bySlug: (slug: string) => `tours:slug:${slug}`,
    byCategory: (categoryId: string) => `tours:category:${categoryId}`,
    byDestination: (destinationId: string) => `tours:destination:${destinationId}`,
    featured: () => 'tours:featured',
    published: () => 'tours:published',
  },
  destinations: {
    all: () => 'destinations:all',
    withCounts: () => 'destinations:withCounts',
    single: (id: string) => `destinations:single:${id}`,
    bySlug: (slug: string) => `destinations:slug:${slug}`,
  },
  categories: {
    all: () => 'categories:all',
    single: (id: string) => `categories:single:${id}`,
  },
  interests: {
    all: () => 'interests:all',
    single: (slug: string) => `interests:single:${slug}`,
  },
  attractions: {
    all: () => 'attractions:all',
    single: (slug: string) => `attractions:single:${slug}`,
  },
};