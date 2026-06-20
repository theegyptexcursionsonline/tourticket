// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import TourModel from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostClient from './BlogPostClient';
import BlogPostSchema from '@/components/schema/BlogPostSchema';
import type { IBlog } from '@/lib/models/Blog';
import { localizeHtmlLinks } from '@/lib/i18n/localizeHtmlLinks';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';

type Params = { locale: string; slug: string };

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  try {
    await dbConnect();
    const { slug, locale } = await params;
    const blog = await Blog.findOne({ slug, status: 'published' }).lean();

    if (!blog) return { title: 'Blog Post Not Found' };

    return {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt,
      alternates: metadataAlternates(locale, `/blog/${slug}`),
      openGraph: {
        title: blog.metaTitle || blog.title,
        description: blog.metaDescription || blog.excerpt,
        images: blog.featuredImage ? [blog.featuredImage] : undefined,
        type: 'article',
        publishedTime: blog.publishedAt?.toISOString(),
        authors: blog.author ? [blog.author] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: blog.metaTitle || blog.title,
        description: blog.metaDescription || blog.excerpt,
        images: blog.featuredImage ? [blog.featuredImage] : undefined,
      },
    };
  } catch (err) {
    console.error('generateMetadata error:', err);
    return { title: 'Blog' };
  }
}

async function getBlogPost(slug: string) {
  await dbConnect();

  const blog = await Blog.findOne({ slug, status: 'published' })
    .populate('relatedDestinations', 'name slug image')
    .populate('relatedTours', 'title slug image discountPrice')
    .lean();

  if (!blog) {
    return { blog: null, relatedPosts: [] };
  }

  // increment views (fire-and-forget style)
  Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).catch(e => {
    console.error('increment view error:', e);
  });

  const relatedPosts = await Blog.find({
    status: 'published',
    category: blog.category,
    _id: { $ne: blog._id }
  })
    .limit(8)
    .sort({ publishedAt: -1 })
    .select('title slug excerpt featuredImage author publishedAt readTime')
    .lean();

  // Relevant bookable tours for the "Tours you'll love" section: match by the
  // post's tags, then backfill with featured/recent tours so it's never empty.
  const blogTags: string[] = Array.isArray((blog as { tags?: unknown }).tags)
    ? ((blog as { tags?: string[] }).tags as string[])
    : [];
  const tourSelect = 'title slug image images price discountPrice duration location';
  let relevantTours = blogTags.length
    ? await TourModel.find({ isPublished: true, ...DEFAULT_TENANT_FILTER, tags: { $in: blogTags } })
        .limit(6)
        .select(tourSelect)
        .lean()
    : [];
  if (relevantTours.length < 3) {
    const have = new Set(relevantTours.map((t) => String(t._id)));
    const backfill = await TourModel.find({
      isPublished: true,
      ...DEFAULT_TENANT_FILTER,
      _id: { $nin: Array.from(have) },
    })
      .sort({ featured: -1, createdAt: -1 })
      .limit(6 - relevantTours.length)
      .select(tourSelect)
      .lean();
    relevantTours = [...relevantTours, ...backfill];
  }

  return {
    blog: JSON.parse(JSON.stringify(blog)) as IBlog,
    relatedPosts: JSON.parse(JSON.stringify(relatedPosts)) as IBlog[],
    relevantTours: JSON.parse(JSON.stringify(relevantTours)) as Record<string, unknown>[],
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug, locale } = await params;
  const { blog, relatedPosts, relevantTours } = await getBlogPost(slug);

  if (!blog) {
    notFound();
  }

  // Localize in-content links to this page's locale so they don't get
  // cookie-redirected to the wrong locale (see localizeHtmlLinks).
  if (blog.content) {
    blog.content = localizeHtmlLinks(blog.content, locale);
  }

  return (
    <>
      <BlogPostSchema
        title={blog.title}
        slug={slug}
        description={blog.metaDescription || blog.excerpt}
        excerpt={blog.excerpt}
        image={blog.featuredImage}
        author={blog.author}
        publishedAt={blog.publishedAt?.toString()}
        updatedAt={blog.updatedAt?.toString()}
        tags={blog.tags}
      />
      <Header startSolid />
      <main className="pt-20">
        <BlogPostClient blog={blog} relatedPosts={relatedPosts} relevantTours={relevantTours} />
      </main>
      <Footer />
    </>
  );
}
