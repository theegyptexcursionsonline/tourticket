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
  modifiedAt?: string;
  tags?: string[];
  locale?: string;
}

const ORGANIZATION_AUTHOR_PATTERN = /\b(?:editorial|team|staff|company|organisation|organization)\b/i;

export default function BlogPostSchema({ title, slug, description, excerpt, image, author, publishedAt, modifiedAt, tags, locale = 'en' }: Props) {
  const postUrl = localizedAbsoluteUrl(locale, `/blog/${slug}`);
  const safeAuthor = author?.trim();
  const safeTags = tags?.map((tag) => tag.trim()).filter(Boolean);
  const authorType = safeAuthor && ORGANIZATION_AUTHOR_PATTERN.test(safeAuthor)
    ? 'Organization'
    : 'Person';

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['BlogPosting', 'Article'],
        headline: title,
        ...((description || excerpt) ? { description: description || excerpt } : {}),
        url: postUrl,
        ...(image ? { image } : {}),
        ...(safeAuthor ? { author: { '@type': authorType, name: safeAuthor } } : {}),
        publisher: { '@id': `${SEO_BASE_URL}/#organization` },
        ...(publishedAt ? { datePublished: publishedAt } : {}),
        ...(modifiedAt ? { dateModified: modifiedAt } : {}),
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
