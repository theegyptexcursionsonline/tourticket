// app/api/cron/trip-reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendTripReminders } from '@/lib/jobs/emailJobs';

export async function GET(request: NextRequest) {
  // Optional: Add authentication for cron jobs
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendTripReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to send trip reminders' },
      { status: 500 }
    );
  }
}