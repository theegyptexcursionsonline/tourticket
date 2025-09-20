// app/api/cron/trip-completion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendTripCompletionEmails } from '@/lib/jobs/emailJobs';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendTripCompletionEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to send trip completion emails' },
      { status: 500 }
    );
  }
}