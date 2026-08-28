// CollectionPage + BreadcrumbList schema for listing pages (destinations, categories, interests, blog)
import React from 'react';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import { localizedAbsoluteUrl, SEO_BASE_URL } from '@/lib/i18n/seoAlternates';

interface ListItem {
  name: string;
  url: string;
  image?: string;
}

interface Props {
  name: string;
  description?: string;
  url: string;
  items?: ListItem[];
  breadcrumbs?: { name: string; url: string }[];
  locale?: string;
}

export default function CollectionSchema({ name, description, url, items = [], breadcrumbs, locale = 'en' }: Props) {
  const fullUrl = localizedAbsoluteUrl(locale, url);
  const crumbs = (breadcrumbs || []).filter(
    (crumb) => crumb.name.trim().length > 0 && crumb.url.trim().length > 0,
  );
  const seenUrls = new Set<string>();
  const visibleItems = items
    .filter((item) => item.name.trim().length > 0 && item.url.trim().length > 0)
    .filter((item) => {
      const itemUrl = localizedAbsoluteUrl(locale, item.url);
      if (seenUrls.has(itemUrl)) return false;
      seenUrls.add(itemUrl);
      return true;
    })
    .slice(0, 30);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name,
        ...(description ? { description } : {}),
        url: fullUrl,
        isPartOf: { '@id': `${SEO_BASE_URL}/#website` },
        about: { '@id': `${SEO_BASE_URL}/#organization` },
      },
      ...(visibleItems.length > 0
        ? [
            {
              '@type': 'ItemList',
              name,
              numberOfItems: visibleItems.length,
              itemListElement: visibleItems.map((item, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: item.name,
                url: localizedAbsoluteUrl(locale, item.url),
                ...(item.image ? { image: item.image } : {}),
              })),
            },
          ]
        : []),
      ...(crumbs.length > 0
        ? [{
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.name,
              item: localizedAbsoluteUrl(locale, c.url),
            })),
          }]
        : []),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
    />
  );
}
