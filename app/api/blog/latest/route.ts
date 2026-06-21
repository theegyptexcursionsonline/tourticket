// Public read API: latest published blog posts for the home-page "From our blog"
// section. Keeps the section self-contained (client-fetched, lazy) so it doesn't
// need to thread data through the server home composition.

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) return NextResponse.json({ posts: [] });
    await dbConnect();
    const docs = await Blog.find({ status: 'published' })
      .sort({ featured: -1, publishedAt: -1 })
      .limit(6)
      .select('slug title excerpt featuredImage category readTime publishedAt translations')
      .lean();

    const posts = (docs as unknown as Record<string, unknown>[]).map((d) => {
      // translations is a Mongoose Map under lean() — normalize to a plain object.
      const raw = d.translations as unknown;
      const translations =
        raw instanceof Map ? Object.fromEntries(raw) : (raw as Record<string, unknown>) || {};
      return {
        slug: d.slug,
        title: d.title,
        excerpt: d.excerpt,
        featuredImage: d.featuredImage,
        category: d.category,
        readTime: d.readTime,
        publishedAt: d.publishedAt,
        translations,
      };
    });

    return NextResponse.json({ posts });
  } catch (err) {
    console.error('latest blog error:', err);
    return NextResponse.json({ posts: [] });
  }
}
