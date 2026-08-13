import { MetadataRoute } from 'next';
import dbConnect from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { locales, defaultLocale } from '@/i18n/config';
import { contentPath, attractionPagePath } from '@/lib/content/contentUrl';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

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
        { isPublished: true, ...DEFAULT_TENANT_FILTER },
        { slug: 1, updatedAt: 1, urlType: 1, destination: 1, parentPage: 1 }
      ).populate('destination', 'slug').lean();

      for (const tour of tours) {
        const citySlug = tour.destination && typeof tour.destination === 'object'
          ? (tour.destination as { slug?: string }).slug
          : undefined;
        const path = contentPath('tour', tour.slug, tour.urlType, citySlug, tour.parentPage?.slug);
        entries.push({
          url: `${BASE_URL}${path}`,
          lastModified: tour.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.9,
          alternates: getAlternates(path),
        });
        for (const locale of locales) {
          if (locale === defaultLocale) continue;
          entries.push({
            url: `${BASE_URL}/${locale}${path}`,
            lastModified: tour.updatedAt || new Date(),
            changeFrequency: 'weekly',
            priority: 0.85,
            alternates: getAlternates(path),
          });
        }
      }
    }

    // Destinations
    const Destination = mongoose.models.Destination;
    if (Destination) {
      const destinations = await Destination.find(
        { isPublished: { $ne: false }, ...DEFAULT_TENANT_FILTER },
        { slug: 1, updatedAt: 1, urlType: 1, parentPage: 1 }
      ).lean();

      for (const dest of destinations) {
        const path = contentPath('destination', dest.slug, dest.urlType, undefined, dest.parentPage?.slug);
        entries.push({
          url: `${BASE_URL}${path}`,
          lastModified: dest.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: getAlternates(path),
        });
        for (const locale of locales) {
          if (locale === defaultLocale) continue;
          entries.push({
            url: `${BASE_URL}/${locale}${path}`,
            lastModified: dest.updatedAt || new Date(),
            changeFrequency: 'weekly',
            priority: 0.75,
            alternates: getAlternates(path),
          });
        }
      }
    }

    // Categories
    const Category = mongoose.models.Category;
    if (Category) {
      const categories = await Category.find(
        { isPublished: true, ...DEFAULT_TENANT_FILTER },
        { slug: 1, updatedAt: 1, urlType: 1, cityDestination: 1, parentPage: 1 }
      ).populate('cityDestination', 'slug').lean();

      for (const cat of categories) {
        const catCity = cat.cityDestination && typeof cat.cityDestination === 'object'
          ? (cat.cityDestination as { slug?: string }).slug
          : undefined;
        const path = contentPath('category', cat.slug, cat.urlType, catCity, cat.parentPage?.slug);
        entries.push({
          url: `${BASE_URL}${path}`,
          lastModified: cat.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: getAlternates(path),
        });
        for (const locale of locales) {
          if (locale === defaultLocale) continue;
          entries.push({
            url: `${BASE_URL}/${locale}${path}`,
            lastModified: cat.updatedAt || new Date(),
            changeFrequency: 'weekly',
            priority: 0.65,
            alternates: getAlternates(path),
          });
        }
      }
    }

    // Published blog posts
    const Blog = mongoose.models.Blog;
    if (Blog) {
      const posts = await Blog.find(
        { status: 'published', ...DEFAULT_TENANT_FILTER },
        { slug: 1, updatedAt: 1, publishedAt: 1 }
      ).lean();

      for (const post of posts) {
        entries.push({
          url: `${BASE_URL}/blog/${post.slug}`,
          lastModified: post.updatedAt || post.publishedAt || new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
          alternates: getAlternates(`/blog/${post.slug}`),
        });
        for (const locale of locales) {
          if (locale === defaultLocale) continue;
          entries.push({
            url: `${BASE_URL}/${locale}/blog/${post.slug}`,
            lastModified: post.updatedAt || post.publishedAt || new Date(),
            changeFrequency: 'monthly',
            priority: 0.65,
            alternates: getAlternates(`/blog/${post.slug}`),
          });
        }
      }
    }

    // Published attraction/landing pages. Attraction-type pages honor the
    // admin-chosen urlType; category-landing pages live at /category/{slug}.
    const AttractionPage = mongoose.models.AttractionPage;
    if (AttractionPage) {
      const attractions = await AttractionPage.find(
        { isPublished: true, ...DEFAULT_TENANT_FILTER },
        { slug: 1, updatedAt: 1, pageType: 1, urlType: 1, cityDestination: 1, parentPage: 1 }
      ).populate('cityDestination', 'slug').lean();

      for (const attraction of attractions) {
        const pageCity = attraction.cityDestination && typeof attraction.cityDestination === 'object'
          ? (attraction.cityDestination as { slug?: string }).slug
          : undefined;
        const path = attractionPagePath(attraction.slug, attraction.pageType, attraction.urlType, pageCity, attraction.parentPage?.slug);
        entries.push({
          url: `${BASE_URL}${path}`,
          lastModified: attraction.updatedAt || new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
          alternates: getAlternates(path),
        });
        for (const locale of locales) {
          if (locale === defaultLocale) continue;
          entries.push({
            url: `${BASE_URL}/${locale}${path}`,
            lastModified: attraction.updatedAt || new Date(),
            changeFrequency: 'monthly',
            priority: 0.65,
            alternates: getAlternates(path),
          });
        }
      }
    }
  } catch (error) {
    console.error('Sitemap generation - database error:', error);
    // Return static pages only if DB is unavailable
  }

  return entries;
}
