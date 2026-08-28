// Organization schema containing only facts verified by the storefront itself.
import React from 'react';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import { SEO_BASE_URL } from '@/lib/i18n/seoAlternates';

export default function OrganizationSchema() {
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SEO_BASE_URL}/#organization`,
        name: 'Egypt Excursions Online',
        alternateName: 'EEO',
        url: SEO_BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: `${SEO_BASE_URL}/EEO-logo.png`,
        },
        description:
          'Egypt Excursions Online offers unforgettable tours, day trips, and excursions across Egypt including Hurghada, Cairo, Luxor, Sharm El Sheikh, and Aswan.',
        areaServed: { '@type': 'Country', name: 'Egypt' },
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
