// app/api/admin/blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

export async function GET() {
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const posts = await Blog.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: posts }, { status: 200 });
  } catch (error) {
    console.error('Error listing blog posts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const data = await request.json();
    const created = await Blog.create(data);
    return NextResponse.json({ success: true, data: created, message: 'Blog post created' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating blog post:', error);
    if (error.code === 11000 && error.keyValue) {
      const field = Object.keys(error.keyValue)[0];
      return NextResponse.json({ success: false, error: `${field} already exists` }, { status: 400 });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create blog post' }, { status: 500 });
  }
}
