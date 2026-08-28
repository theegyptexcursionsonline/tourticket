// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import TourModel from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostClient, { type BlogPost, type TourPreview } from './BlogPostClient';
import BlogPostSchema from '@/components/schema/BlogPostSchema';
import { localizeHtmlLinks } from '@/lib/i18n/localizeHtmlLinks';
import { localizedDocumentMetadata } from '@/lib/i18n/seoAlternates';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import ContextualDiscoveryLinks from '@/components/seo/ContextualDiscoveryLinks';
import {
  localizedContentPath,
  localizedRoutePath,
  localizedTourContentPath,
} from '@/lib/content/contentUrl';

const LOCALIZED_BLOG_FIELDS = ['title', 'excerpt', 'content', 'metaTitle', 'metaDescription'];

type Params = { locale: string; slug: string };

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant
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
    const blog = await Blog.findOne({ slug, status: 'published', ...DEFAULT_TENANT_FILTER }).lean();

    if (!blog) return { title: 'Blog Post Not Found' };

    // Serialize first so the translations Map becomes a plain object that
    // localizeEntityFields can read; keep `blog` for the Date fields.
    const lz = localizeEntityFields(
      JSON.parse(JSON.stringify(blog)) as Record<string, unknown>,
      locale,
      LOCALIZED_BLOG_FIELDS,
    );
    const title = (lz.metaTitle as string) || (lz.title as string);
    const description = (lz.metaDescription as string) || (lz.excerpt as string);

    return {
      title,
      description,
      ...localizedDocumentMetadata(
        locale,
        `/blog/${slug}`,
        blog,
        ['title', 'excerpt', 'content'],
      ),
      openGraph: {
        title,
        description,
        images: blog.featuredImage ? [blog.featuredImage] : undefined,
        type: 'article',
        publishedTime: blog.publishedAt?.toISOString(),
        authors: blog.author ? [blog.author] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
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

  const blog = await Blog.findOne({ slug, status: 'published', ...DEFAULT_TENANT_FILTER })
    .populate({ path: 'relatedDestinations', select: 'name slug image urlType parentPage', match: { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER } })
    .populate({ path: 'relatedTours', select: 'title slug image discountPrice urlType destination parentPage', match: { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER }, populate: { path: 'destination', select: 'slug' } })
    .lean();

  if (!blog) {
    return { blog: null, relatedPosts: [] as BlogPost[], relevantTours: [] as TourPreview[] };
  }

  // increment views (fire-and-forget style)
  Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).catch(e => {
    console.error('increment view error:', e);
  });

  const relatedPosts = await Blog.find({
    status: 'published',
    category: blog.category,
    _id: { $ne: blog._id },
    ...DEFAULT_TENANT_FILTER,
  })
    .limit(8)
    .sort({ publishedAt: -1 })
    .select('title slug excerpt featuredImage imageMetadata author publishedAt readTime')
    .lean();

  // Relevant tours must share an explicit stored tag with the article. Do not
  // backfill unrelated inventory merely to force a section to appear.
  const blogTags: string[] = Array.isArray((blog as { tags?: unknown }).tags)
    ? ((blog as { tags?: string[] }).tags as string[])
    : [];
  const tourSelect = 'title slug urlType parentPage destination image images price discountPrice duration location';
  const relevantTours = blogTags.length
    ? await TourModel.find({ ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER, tags: { $in: blogTags } })
        .limit(6)
        .select(tourSelect)
        .populate('destination', 'slug')
        .lean()
    : [];
  return {
    blog: JSON.parse(JSON.stringify(blog)) as BlogPost,
    relatedPosts: JSON.parse(JSON.stringify(relatedPosts)) as BlogPost[],
    relevantTours: JSON.parse(JSON.stringify(relevantTours)) as TourPreview[],
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug, locale } = await params;
  const { blog, relatedPosts, relevantTours } = await getBlogPost(slug);

  if (!blog) {
    notFound();
  }

  // Overlay the locale's translation onto the post (English fallback per field),
  // then fix in-content links to match the page locale.
  const localized = localizeEntityFields(
    blog as unknown as Record<string, unknown>,
    locale,
    LOCALIZED_BLOG_FIELDS,
  ) as unknown as typeof blog;
  if (localized.content) {
    localized.content = localizeHtmlLinks(localized.content, locale);
  }
  const contextualLinks = [
    ...(localized.relatedDestinations || []).map((destination) => ({
      label: destination.name,
      href: localizedContentPath(
        'destination',
        destination.slug,
        destination.urlType,
        locale,
        null,
        destination.parentPage?.slug,
      ),
    })),
    ...(localized.relatedTours || []).map((tour) => ({
      label: tour.title,
      href: localizedTourContentPath(tour, locale),
    })),
    ...relatedPosts.map((post) => ({
      label: post.title,
      href: localizedRoutePath(`/blog/${post.slug}`, locale),
    })),
  ];

  return (
    <>
      <BlogPostSchema
        locale={locale}
        title={localized.title}
        slug={slug}
        description={localized.excerpt}
        excerpt={localized.excerpt}
        image={localized.featuredImage}
        author={localized.author}
        publishedAt={localized.publishedAt?.toString()}
        tags={localized.tags}
      />
      <Header startSolid />
      <main className="pt-20">
        <BlogPostClient blog={localized} relatedPosts={relatedPosts} relevantTours={relevantTours} />
        <ContextualDiscoveryLinks locale={locale} links={contextualLinks} />
      </main>
      <Footer />
    </>
  );
}
