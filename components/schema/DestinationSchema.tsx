// Place + TouristDestination schema for destination detail pages
import React from 'react';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import { contentPath, localizedTourContentPath } from '@/lib/content/contentUrl';
import { localizedAbsoluteUrl, SEO_BASE_URL } from '@/lib/i18n/seoAlternates';

interface Tour {
  title: string;
  slug: string;
  image?: string;
  urlType?: string;
  destination?: { slug?: string } | string;
  parentPage?: { slug?: string } | null;
}

interface Props {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  country?: string;
  tours?: Tour[];
  urlType?: string;
  parentPage?: { slug?: string } | null;
  breadcrumbs?: { name: string; url: string }[];
  locale?: string;
}

export default function DestinationSchema({ name, slug, description, image, tours = [], urlType, parentPage, breadcrumbs, locale = 'en' }: Props) {
  const destUrl = localizedAbsoluteUrl(locale, contentPath('destination', slug, urlType, null, parentPage?.slug));
  const seenUrls = new Set<string>();
  const visibleTours = tours
    .filter((tour) => tour.title.trim().length > 0 && tour.slug.trim().length > 0)
    .filter((tour) => {
      const tourUrl = `${SEO_BASE_URL}${localizedTourContentPath(tour, locale)}`;
      if (seenUrls.has(tourUrl)) return false;
      seenUrls.add(tourUrl);
      return true;
    })
    .slice(0, 20);
  const visibleBreadcrumbs = (breadcrumbs || []).filter(
    (crumb) => crumb.name.trim().length > 0 && crumb.url.trim().length > 0,
  );

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['TouristDestination', 'Place'],
        name,
        ...(description ? { description } : {}),
        url: destUrl,
        ...(image ? { image } : {}),
      },
      // tours as ItemList for Things To Do
      ...(visibleTours.length > 0
        ? [
            {
              '@type': 'ItemList',
              numberOfItems: visibleTours.length,
              itemListElement: visibleTours.map((t, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SEO_BASE_URL}${localizedTourContentPath(t, locale)}`,
                name: t.title,
                ...(t.image ? { image: t.image } : {}),
              })),
            },
          ]
        : []),
      ...(visibleBreadcrumbs.length > 0
        ? [{
            '@type': 'BreadcrumbList',
            itemListElement: visibleBreadcrumbs.map((crumb, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: crumb.name,
              item: localizedAbsoluteUrl(locale, crumb.url),
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
