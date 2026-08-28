// ItemList schema for tour listing pages — Google Things To Do
import React from 'react';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import { localizedTourContentPath } from '@/lib/content/contentUrl';
import { SEO_BASE_URL } from '@/lib/i18n/seoAlternates';

interface TourItem {
  title: string;
  slug: string;
  image?: string;
  urlType?: string;
  destination?: { slug?: string } | string;
  parentPage?: { slug?: string } | null;
}

interface Props {
  tours: TourItem[];
  listName: string;
  listDescription?: string;
  locale?: string;
}

export default function ToursListSchema({
  tours,
  listName,
  listDescription,
  locale = 'en',
}: Props) {
  if (!tours || tours.length === 0) return null;

  const seenUrls = new Set<string>();
  const visibleTours = tours
    .filter((tour) => tour.title.trim().length > 0 && tour.slug.trim().length > 0)
    .filter((tour) => {
      const tourUrl = `${SEO_BASE_URL}${localizedTourContentPath(tour, locale)}`;
      if (seenUrls.has(tourUrl)) return false;
      seenUrls.add(tourUrl);
      return true;
    })
    .slice(0, 30);

  if (visibleTours.length === 0) return null;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    ...(listDescription ? { description: listDescription } : {}),
    numberOfItems: visibleTours.length,
    itemListElement: visibleTours.map((tour, i) => {
      const tourUrl = `${SEO_BASE_URL}${localizedTourContentPath(tour, locale)}`;

      return {
        '@type': 'ListItem',
        position: i + 1,
        url: tourUrl,
        name: tour.title,
        ...(tour.image ? { image: tour.image } : {}),
        item: {
          '@type': 'TouristTrip',
          name: tour.title,
          url: tourUrl,
          ...(tour.image ? { image: tour.image } : {}),
        },
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
    />
  );
}
