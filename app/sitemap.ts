import { MetadataRoute } from 'next';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { locales, defaultLocale } from '@/i18n/config';

const BASE_URL = 'https://egypt-excursionsonline.com';

function getAlternates(path: string) {
  return {
    languages: Object.fromEntries(
      locales.map(locale => [
        locale,
        `${BASE_URL}${locale === defaultLocale ? '' : '/' + locale}${path}`,
      ])
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  const staticPages = [
    { url: '/', changeFrequency: 'daily' as const, priority: 1.0 },
    { url: '/about', changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: '/contact', changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: '/destinations', changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: '/categories', changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: '/tours', changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: '/blog', changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: '/search', changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: '/egypt', changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: '/faqs', changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: '/careers', changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  for (const page of staticPages) {
    // Default locale (English) - no prefix
    entries.push({
      url: `${BASE_URL}${page.url}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: getAlternates(page.url),
    });

    // Other locales - with prefix
    for (const locale of locales) {
      if (locale === defaultLocale) continue;
      entries.push({
        url: `${BASE_URL}/${locale}${page.url}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority * 0.9,
        alternates: getAlternates(page.url),
      });
    }
  }

  // Dynamic pages from database
  try {
    await dbConnect();

    // Published tours (these use the /[slug] catch-all route)
    const Tour = mongoose.models.Tour;
    if (Tour) {
      const tours = await Tour.find(
        { isPublished: true },
        { slug: 1, updatedAt: 1 }
      ).lean();

      for (const tour of tours) {
        entries.push({
          url: `${BASE_URL}/${tour.slug}`,
          lastModified: tour.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.9,
          alternates: getAlternates(`/${tour.slug}`),
        });
        for (const locale of locales) {
          if (locale === defaultLocale) continue;
          entries.push({
            url: `${BASE_URL}/${locale}/${tour.slug}`,
            lastModified: tour.updatedAt || new Date(),
            changeFrequency: 'weekly',
            priority: 0.85,
            alternates: getAlternates(`/${tour.slug}`),
          });
        }
      }
    }

    // Destinations
    const Destination = mongoose.models.Destination;
    if (Destination) {
      const destinations = await Destination.find(
        {},
        { slug: 1, updatedAt: 1 }
      ).lean();

      for (const dest of destinations) {
        entries.push({
          url: `${BASE_URL}/destinations/${dest.slug}`,
          lastModified: dest.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }

    // Categories
    const Category = mongoose.models.Category;
    if (Category) {
      const categories = await Category.find(
        { isPublished: true },
        { slug: 1, updatedAt: 1 }
      ).lean();

      for (const cat of categories) {
        entries.push({
          url: `${BASE_URL}/categories/${cat.slug}`,
          lastModified: cat.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }

    // Published blog posts
    const Blog = mongoose.models.Blog;
    if (Blog) {
      const posts = await Blog.find(
        { status: 'published' },
        { slug: 1, updatedAt: 1, publishedAt: 1 }
      ).lean();

      for (const post of posts) {
        entries.push({
          url: `${BASE_URL}/blog/${post.slug}`,
          lastModified: post.updatedAt || post.publishedAt || new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }

    // Published attraction pages
    const AttractionPage = mongoose.models.AttractionPage;
    if (AttractionPage) {
      const attractions = await AttractionPage.find(
        { isPublished: true },
        { slug: 1, updatedAt: 1 }
      ).lean();

      for (const attraction of attractions) {
        entries.push({
          url: `${BASE_URL}/attraction/${attraction.slug}`,
          lastModified: attraction.updatedAt || new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.error('Sitemap generation - database error:', error);
    // Return static pages only if DB is unavailable
  }

  return entries;
}
