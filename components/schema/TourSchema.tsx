// TourProduct + Event + Offer + AggregateRating + Review + ImageObject schema for tour detail pages
import React from 'react';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import { contentPath } from '@/lib/content/contentUrl';
import { effectiveTourPrice } from '@/lib/pricing/effectivePrice';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';
const SCHEMA_START_DATE = new Date().toISOString().split('T')[0];
const SCHEMA_END_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

interface Review {
  _id?: string;
  user?: { name?: string; picture?: string };
  rating: number;
  comment?: string;
  text?: string;
  createdAt?: string;
}

interface Tour {
  _id?: string;
  title: string;
  slug: string;
  description?: string;
  longDescription?: string;
  image?: string;
  images?: string[];
  originalPrice?: number;
  discountPrice?: number;
  discountPercent?: number;
  duration?: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
  destination?: { name?: string; slug?: string; urlType?: string; parentPage?: { slug?: string } | null } | string;
  category?: { name?: string; slug?: string } | string;
  includes?: string[];
  highlights?: string[];
  cancellationPolicy?: string;
  operatedBy?: string;
  maxGroupSize?: number;
  languages?: string[];
  urlType?: string;
  parentPage?: { slug?: string } | null;
}

interface Props {
  tour: Tour;
  reviews?: Review[];
}

export default function TourSchema({ tour, reviews = [] }: Props) {
  const pricing = effectiveTourPrice(tour);
  const price = pricing.price;
  const tourUrl = `${BASE_URL}${contentPath('tour', tour.slug, tour.urlType, null, tour.parentPage?.slug)}`;
  const destName = typeof tour.destination === 'object' ? tour.destination?.name : tour.destination;
  const catName = typeof tour.category === 'object' ? tour.category?.name : tour.category;

  // build image objects
  const allImages = [tour.image, ...(tour.images || [])].filter(Boolean);
  const imageObjects = allImages.map((img, i) => ({
    '@type': 'ImageObject' as const,
    url: img,
    name: `${tour.title} - Image ${i + 1}`,
    caption: tour.title,
  }));

  // build review objects
  const reviewObjects = reviews.slice(0, 10).map((r) => ({
    '@type': 'Review' as const,
    author: {
      '@type': 'Person' as const,
      name: r.user?.name || 'Guest',
    },
    datePublished: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : undefined,
    reviewBody: r.comment || r.text || '',
    reviewRating: {
      '@type': 'Rating' as const,
      ratingValue: r.rating.toString(),
      bestRating: '5',
    },
  }));

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      // Product schema (for Google rich results)
      {
        '@type': 'Product',
        '@id': `${tourUrl}/#product`,
        name: tour.title,
        description: tour.description || tour.longDescription?.substring(0, 300),
        image: allImages,
        url: tourUrl,
        brand: {
          '@type': 'Organization',
          name: 'Egypt Excursions Online',
        },
        offers: {
          '@type': 'Offer',
          url: tourUrl,
          priceCurrency: 'USD',
          price: price.toString(),
          ...(pricing.discountApplied
            ? {
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  price: pricing.price.toString(),
                  priceCurrency: 'USD',
                  valueAddedTaxIncluded: true,
                },
              }
            : {}),
          availability: 'https://schema.org/InStock',
          validFrom: new Date().toISOString().split('T')[0],
          seller: { '@id': `${BASE_URL}/#organization` },
        },
        ...(tour.rating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: tour.rating.toString(),
                reviewCount: (tour.reviewCount || reviews.length || 1).toString(),
                bestRating: '5',
                worstRating: '1',
              },
            }
          : {}),
        ...(reviewObjects.length > 0 ? { review: reviewObjects } : {}),
        category: catName || 'Tours & Excursions',
      },

      // Event schema (for tour as bookable event)
      {
        '@type': 'Event',
        name: tour.title,
        description: tour.description,
        image: tour.image,
        url: tourUrl,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: tour.location || destName || 'Egypt',
          address: {
            '@type': 'PostalAddress',
            addressLocality: destName || 'Egypt',
            addressCountry: 'EG',
          },
        },
        organizer: { '@id': `${BASE_URL}/#organization` },
        performer: {
          '@type': 'Organization',
          name: tour.operatedBy || 'Egypt Excursions Online',
        },
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: price.toString(),
          highPrice: pricing.originalPrice.toString(),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: tourUrl,
        },
        startDate: SCHEMA_START_DATE,
        endDate: SCHEMA_END_DATE,
        ...(tour.maxGroupSize ? { maximumAttendeeCapacity: tour.maxGroupSize } : {}),
      },

      // TouristTrip for Google Things To Do
      {
        '@type': 'TouristTrip',
        name: tour.title,
        description: tour.description,
        image: allImages,
        url: tourUrl,
        touristType: 'Sightseeing',
        ...(tour.includes
          ? {
              itinerary: {
                '@type': 'ItemList',
                itemListElement: tour.includes.map((item, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  name: item,
                })),
              },
            }
          : {}),
        offers: {
          '@type': 'Offer',
          price: price.toString(),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        provider: { '@id': `${BASE_URL}/#organization` },
      },

      // Image objects
      ...imageObjects,

      // BreadcrumbList for tour page
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Tours', item: `${BASE_URL}/tours` },
          ...(destName
            ? [
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: destName,
                  item: `${BASE_URL}${typeof tour.destination === 'object'
                    ? contentPath('destination', tour.destination?.slug || '', tour.destination?.urlType, null, tour.destination?.parentPage?.slug)
                    : '/destinations'}`,
                },
                { '@type': 'ListItem', position: 4, name: tour.title, item: tourUrl },
              ]
            : [{ '@type': 'ListItem', position: 3, name: tour.title, item: tourUrl }]),
        ],
      },

      // WebPage with speakable
      {
        '@type': 'WebPage',
        '@id': `${tourUrl}/#webpage`,
        url: tourUrl,
        name: tour.title,
        description: tour.description,
        isPartOf: { '@id': `${BASE_URL}/#website` },
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.tour-description', '.tour-highlights', '.tour-includes'],
        },
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
