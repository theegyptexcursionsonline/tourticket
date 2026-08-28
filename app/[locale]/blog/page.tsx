import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogClientPage from './BlogClientPage';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { IBlog } from '@/lib/models/Blog';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Travel Blog - Tips, Guides & Stories | Egypt Excursions Online',
    description: 'Discover travel tips, destination guides, and inspiring stories from Egypt. Expert advice for planning your perfect Egyptian adventure.',
    openGraph: {
      title: 'Travel Blog | Egypt Excursions Online',
      description: 'Discover travel tips, destination guides, and inspiring stories from Egypt.',
      type: 'website',
    },
    alternates: metadataAlternates(locale, '/blog'),
  };
}

const categories = [
  { value: 'travel-tips', label: 'Travel Tips' },
  { value: 'destination-guides', label: 'Destination Guides' },
  { value: 'food-culture', label: 'Food & Culture' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'budget-travel', label: 'Budget Travel' },
  { value: 'luxury-travel', label: 'Luxury Travel' },
  { value: 'solo-travel', label: 'Solo Travel' },
  { value: 'family-travel', label: 'Family Travel' },
  { value: 'photography', label: 'Photography' },
  { value: 'local-insights', label: 'Local Insights' },
  { value: 'seasonal-travel', label: 'Seasonal Travel' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'news-updates', label: 'News & Updates' },
];

async function getBlogsWithCategoryCounts(): Promise<{
  blogs: IBlog[];
  categoryCounts: { value: string; label: string; count: number }[];
  featuredPosts: IBlog[];
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
      .populate({ path: 'relatedDestinations', select: 'name slug urlType parentPage', match: PUBLIC_CONTENT_FILTER })
      .populate({ path: 'relatedTours', select: 'title slug urlType parentPage', match: PUBLIC_CONTENT_FILTER });

    // Get featured posts
    const featuredPosts = await Blog.find({ status: 'published', featured: true, ...DEFAULT_TENANT_FILTER })
      .sort({ publishedAt: -1 })
      .limit(3)
      .populate({ path: 'relatedDestinations', select: 'name slug urlType parentPage', match: PUBLIC_CONTENT_FILTER })
      .populate({ path: 'relatedTours', select: 'title slug urlType parentPage', match: PUBLIC_CONTENT_FILTER });

    // Get category counts
    const categoryCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Blog.countDocuments({
          status: 'published',
          category: category.value,
          ...DEFAULT_TENANT_FILTER,
        });
        return { ...category, count };
      })
    );

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
  const { blogs, categoryCounts, featuredPosts } = await getBlogsWithCategoryCounts();

  return (
    <>
      <CollectionSchema
        locale={locale}
        name="Travel Stories & Insights"
        description="Discover amazing destinations, travel tips, and cultural experiences from around the world"
        url="/blog"
        items={blogs.map((blog) => ({ name: blog.title, url: `/blog/${blog.slug}`, image: blog.featuredImage }))}
      />
      <Header startSolid />
      <main className="min-h-screen pt-20">
        <BlogClientPage
          blogs={blogs}
          categories={categoryCounts}
          featuredPosts={featuredPosts}
        />
      </main>
      <Footer />
    </>
  );
}
