// lib/redis.ts
import Redis from 'ioredis';

let redis: Redis | null = null;

if (!redis) {
  // Use a single Redis connection. Use REDIS_URL or separate host/port envs.
  const url = process.env.REDIS_URL ?? process.env.REDIS_URI ?? null;

  if (!url) {
    // In dev without Redis, create a dummy in-memory shim with minimal API to avoid crashes.
    // This is only for local dev — prefer having a real Redis in staging/prod.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memoryCache: Record<string, string> = {};
    redis = {
      get: async (k: string) => memoryCache[k] ?? null,
      set: async (k: string, v: string, ...args: any[]) => {
        // if args contains 'EX' we won't implement expiry for the shim
        memoryCache[k] = v;
        return 'OK';
      },
      del: async (k: string) => {
        delete memoryCache[k];
        return 1;
      },
      // minimal placeholders to satisfy ioredis typing in usage sites
    } as unknown as Redis;
  } else {
    redis = new Redis(url, {
      // optional tuning
      maxRetriesPerRequest: 1,
      enableAutoPipelining: true,
      // keepAlive settings etc. can be added
    });
    redis.on('error', (e) => {
      console.error('Redis error', e);
    });
  }
}

export default redis!;
