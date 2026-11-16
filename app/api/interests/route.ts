// app/api/interests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedInterests, interestsLocale } from '@/lib/interests/interestsList';

export async function GET(request: NextRequest) {
  try {
    const locale = interestsLocale(request.nextUrl.searchParams.get('locale'));
    const allInterests = await getCachedInterests(locale);
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
