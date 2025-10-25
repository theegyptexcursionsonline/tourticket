// app/api/cache/clear/route.ts
import { NextResponse } from 'next/server';
import { invalidateCache, clearAllCache } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pattern } = body;

    if (pattern) {
      await invalidateCache(pattern);
      return NextResponse.json({
        success: true,
        message: `Cache cleared for pattern: ${pattern}`
      });
    } else {
      await clearAllCache();
      return NextResponse.json({
        success: true,
        message: 'All cache cleared'
      });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
