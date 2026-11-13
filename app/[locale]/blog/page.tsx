import { blogRelatedPopulations } from '@/lib/content/blogReferences';
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogClientPage from './BlogClientPage';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import { requireRouteLocale } from '@/lib/i18n/routeLocale';
import { getTranslations } from 'next-intl/server';
import { BLOG_CATEGORIES } from '@/lib/blog/blogDisplay';
import { toBlogCard, type BlogCardData } from '@/lib/blog/blogCards';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Probes such as /wp-good.php reach here with a fake locale: answer 404, not a server error.
  requireRouteLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog.meta' });
  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      type: 'website',
    },
    alternates: metadataAlternates(locale, '/blog'),
  };
}

type PlainPost = Record<string, unknown>;

async function getBlogsWithCategoryCounts(): Promise<{
  blogs: PlainPost[];
  categoryCounts: { value: string; count: number }[];
  featuredPosts: PlainPost[];
}> {
  // Skip database fetch during build if MONGODB_URI is not set
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ Skipping blog fetch - MONGODB_URI not set');
    return { blogs: [], categoryCounts: [], featuredPosts: [] };
  }

  try {
    await dbConnect();
    
    // Get all published blogs
    const blogs = await Blog.find({ status: 'published', ...DEFAULT_TENANT_FILTER })
      .sort({ publishedAt: -1 })
      .populate(blogRelatedPopulations('list'));

    // Get featured posts
    const featuredPosts = await Blog.find({ status: 'published', featured: true, ...DEFAULT_TENANT_FILTER })
      .sort({ publishedAt: -1 })
      .limit(3)
      .populate(blogRelatedPopulations('list'));

    // Category counts: one grouped query instead of one count per category.
    const grouped = await Blog.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          status: 'published',
          category: { $in: [...BLOG_CATEGORIES] },
          ...DEFAULT_TENANT_FILTER,
        },
      },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(grouped.map((row) => [row._id, row.count]));
    const categoryCounts = BLOG_CATEGORIES.map((value) => ({
      value,
      count: countByCategory.get(value) ?? 0,
    }));

    return {
      blogs: JSON.parse(JSON.stringify(blogs)),
      categoryCounts: categoryCounts.filter(cat => cat.count > 0),
      featuredPosts: JSON.parse(JSON.stringify(featuredPosts))
    };
  } catch (error) {
    console.error('Failed to fetch blogs:', error);
    return { blogs: [], categoryCounts: [], featuredPosts: [] };
  }
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog.list' });
  const { blogs, categoryCounts, featuredPosts } = await getBlogsWithCategoryCounts();

  // Cards carry the language of the visitor (English per untranslated field) and only
  // the fields a card shows; post bodies and translations stay on the server.
  const cards: BlogCardData[] = blogs.map((post) => toBlogCard(post, locale));
  const featuredCards: BlogCardData[] = featuredPosts.map((post) => toBlogCard(post, locale));

  return (
    <>
      <CollectionSchema
        locale={locale}
        name={t('title')}
        description={t('subtitle')}
        url="/blog"
        items={cards.map((card) => ({ name: card.title, url: `/blog/${card.slug}`, image: card.featuredImage }))}
      />
      <Header startSolid />
      <main className="min-h-screen pt-20">
        <BlogClientPage
          blogs={cards}
          categories={categoryCounts}
          featuredPosts={featuredCards}
        />
      </main>
      <Footer />
    </>
  );
}
