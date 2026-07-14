import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import BlogLike from '@/lib/models/BlogLike';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import {
  BLOG_VISITOR_COOKIE,
  createBlogVisitorToken,
  hashBlogVisitor,
  verifyBlogVisitorToken,
} from '@/lib/blog/visitorIdentity';

export const dynamic = 'force-dynamic';

const PUBLIC_TENANT_ID = 'default';
const ONE_HOUR = 60 * 60 * 1_000;

function validSlug(value: string): boolean {
  return value.length >= 1 && value.length <= 200 && /^[a-z0-9-]+$/.test(value);
}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function findPublishedBlog(slug: string) {
  return Blog.findOne({ slug, status: 'published', ...DEFAULT_TENANT_FILTER })
    .select('_id tenantId likes legacyLikesBaseline');
}

async function ensureLegacyBaseline(blog: {
  _id: unknown;
  likes?: number;
  legacyLikesBaseline?: number;
}) {
  if (Number.isFinite(blog.legacyLikesBaseline)) return Number(blog.legacyLikesBaseline);
  const baseline = Math.max(0, Number(blog.likes || 0));
  const initialized = await Blog.findOneAndUpdate(
    {
      _id: blog._id,
      $or: [
        { legacyLikesBaseline: { $exists: false } },
        { legacyLikesBaseline: null },
      ],
    },
    { $set: { legacyLikesBaseline: baseline } },
    { new: true },
  ).select('legacyLikesBaseline');
  if (initialized) return Number(initialized.legacyLikesBaseline || 0);
  const reloaded = await Blog.findById(blog._id).select('legacyLikesBaseline');
  return Math.max(0, Number(reloaded?.legacyLikesBaseline || 0));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!validSlug(slug)) return noStoreJson({ success: false, error: 'Blog post not found.' }, 404);
    await dbConnect();
    const blog = await findPublishedBlog(slug);
    if (!blog) return noStoreJson({ success: false, error: 'Blog post not found.' }, 404);

    const visitorId = verifyBlogVisitorToken(request.cookies.get(BLOG_VISITOR_COOKIE)?.value);
    const liked = visitorId
      ? Boolean(await BlogLike.exists({
        tenantId: PUBLIC_TENANT_ID,
        blogId: blog._id,
        visitorHash: hashBlogVisitor(visitorId, PUBLIC_TENANT_ID),
      }))
      : false;

    return noStoreJson({ success: true, liked, likes: Math.max(0, Number(blog.likes || 0)) });
  } catch (error) {
    console.error('Blog like status failed:', error instanceof Error ? error.message : 'unknown_error');
    return noStoreJson({ success: false, error: 'Unable to load like status.' }, 503);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!validSlug(slug)) return noStoreJson({ success: false, error: 'Blog post not found.' }, 404);
    await dbConnect();
    const blog = await findPublishedBlog(slug);
    if (!blog) return noStoreJson({ success: false, error: 'Blog post not found.' }, 404);

    const suppliedVisitorId = verifyBlogVisitorToken(request.cookies.get(BLOG_VISITOR_COOKIE)?.value);
    const token = suppliedVisitorId ? null : createBlogVisitorToken();
    const visitorId = suppliedVisitorId || verifyBlogVisitorToken(token || undefined);
    if (!visitorId) throw new Error('blog_visitor_identity_failed');
    const visitorHash = hashBlogVisitor(visitorId, PUBLIC_TENANT_ID);

    const rate = await enforcePublicActionLimits({
      request,
      action: 'blog-like',
      subject: visitorHash,
      networkLimit: 60,
      subjectLimit: 30,
      windowMs: ONE_HOUR,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many reactions. Please try again later.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(rate.retryAfterSeconds),
          },
        },
      );
    }

    const baseline = await ensureLegacyBaseline(blog);
    const write = await BlogLike.updateOne(
      { tenantId: PUBLIC_TENANT_ID, blogId: blog._id, visitorHash },
      {
        $setOnInsert: {
          tenantId: PUBLIC_TENANT_ID,
          blogId: blog._id,
          visitorHash,
          likedAt: new Date(),
        },
      },
      { upsert: true },
    );
    const durableLikes = await BlogLike.countDocuments({
      tenantId: PUBLIC_TENANT_ID,
      blogId: blog._id,
    });
    const effectiveLikes = baseline + durableLikes;
    const updated = await Blog.findOneAndUpdate(
      { _id: blog._id, ...DEFAULT_TENANT_FILTER },
      { $max: { likes: effectiveLikes } },
      { new: true },
    ).select('likes');

    const response = noStoreJson({
      success: true,
      liked: true,
      replayed: write.upsertedCount === 0,
      likes: Math.max(effectiveLikes, Number(updated?.likes || 0)),
      message: write.upsertedCount === 0 ? 'Your like was already counted.' : 'Thanks for liking this post.',
    });
    if (token) {
      response.cookies.set(BLOG_VISITOR_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (error) {
    console.error('Blog like failed:', error instanceof Error ? error.message : 'unknown_error');
    return noStoreJson({ success: false, error: 'Unable to save this like right now.' }, 503);
  }
}
