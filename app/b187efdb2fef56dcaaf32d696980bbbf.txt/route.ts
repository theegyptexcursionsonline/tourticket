// IndexNow key file — verifies host ownership so the content engine can ping
// Bing/Yandex on publish (https://www.indexnow.org). Must return exactly the key.
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const KEY = 'b187efdb2fef56dcaaf32d696980bbbf';

export function GET() {
  return new NextResponse(KEY, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
