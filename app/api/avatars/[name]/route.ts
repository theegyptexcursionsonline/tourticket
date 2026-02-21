import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/avatars/[name] - Generate or redirect to avatar for user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!name || !name.trim()) {
      // Return a default avatar or redirect to a placeholder
      return NextResponse.redirect(
        'https://ui-avatars.com/api/?name=Guest&background=6366f1&color=fff&size=128'
      );
    }

    // Use ui-avatars.com to generate avatar based on name
    // You can customize colors, size, etc.
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name.trim()
    )}&background=6366f1&color=fff&size=128&bold=true`;

    return NextResponse.redirect(avatarUrl);
  } catch (error) {
    console.error('GET /api/avatars/[name] error:', error);
    // Return default avatar on error
    return NextResponse.redirect(
      'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&size=128'
    );
  }
}

