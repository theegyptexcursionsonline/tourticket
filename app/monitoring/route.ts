import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return new NextResponse(null, { status: 204 });
}

export function POST() {
  return new NextResponse(null, { status: 204 });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
