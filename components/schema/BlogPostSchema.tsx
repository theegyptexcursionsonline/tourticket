// BlogPosting schema for the source-backed fields visible on blog detail pages.
import React from 'react';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import { localizedAbsoluteUrl, SEO_BASE_URL } from '@/lib/i18n/seoAlternates';

interface Props {
  title: string;
  slug: string;
  description?: string;
  excerpt?: string;
  image?: string;
  author?: string;
  publishedAt?: string;
  tags?: string[];
  locale?: string;
}

export default function BlogPostSchema({ title, slug, description, excerpt, image, author, publishedAt, tags, locale = 'en' }: Props) {
  const postUrl = localizedAbsoluteUrl(locale, `/blog/${slug}`);
  const safeAuthor = author?.trim();
  const safeTags = tags?.map((tag) => tag.trim()).filter(Boolean);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['BlogPosting', 'Article'],
        headline: title,
        ...((description || excerpt) ? { description: description || excerpt } : {}),
        url: postUrl,
        ...(image ? { image } : {}),
        ...(safeAuthor ? { author: { '@type': 'Person', name: safeAuthor } } : {}),
        publisher: { '@id': `${SEO_BASE_URL}/#organization` },
        ...(publishedAt ? { datePublished: publishedAt } : {}),
        mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
        ...(safeTags && safeTags.length > 0 ? { keywords: safeTags.join(', ') } : {}),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
    />
  );
}
