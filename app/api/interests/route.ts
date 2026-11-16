// app/api/interests/route.ts
import { NextResponse } from 'next/server';
import { getCachedInterests } from '@/lib/interests/interestsList';

export async function GET() {
  try {
    const allInterests = await getCachedInterests();
    return NextResponse.json({ success: true, data: allInterests });
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch interests.",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
