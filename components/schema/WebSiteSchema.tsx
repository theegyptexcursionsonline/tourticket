// WebSite + WebPage + SiteNavigationElement schema. Breadcrumbs are emitted
// only when the caller also renders that exact breadcrumb trail visibly.
import React from 'react';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import { locales } from '@/i18n/config';
import { localizedAbsoluteUrl, SEO_BASE_URL } from '@/lib/i18n/seoAlternates';

interface Props {
  pageName?: string;
  pageDescription?: string;
  pageUrl?: string;
  breadcrumbs?: { name: string; url: string }[];
  locale?: string;
}

export default function WebSiteSchema({
  pageName = 'Egypt Excursions Online - Tours, Activities & Experiences',
  pageDescription,
  pageUrl = '/',
  breadcrumbs,
  locale = 'en',
}: Props) {
  const absolutePageUrl = localizedAbsoluteUrl(locale, pageUrl);
  const localizedSearchUrl = localizedAbsoluteUrl(locale, '/search');
  const breadcrumbItems = (breadcrumbs || []).filter(
    (item) => item.name.trim().length > 0 && item.url.trim().length > 0,
  );

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SEO_BASE_URL}/#website`,
        url: SEO_BASE_URL,
        name: 'Egypt Excursions Online',
        description: 'Tours, day trips, and excursions across Egypt',
        publisher: { '@id': `${SEO_BASE_URL}/#organization` },
        inLanguage: locales,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${localizedSearchUrl}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${absolutePageUrl}/#webpage`,
        url: absolutePageUrl,
        name: pageName,
        ...(pageDescription ? { description: pageDescription } : {}),
        isPartOf: { '@id': `${SEO_BASE_URL}/#website` },
        about: { '@id': `${SEO_BASE_URL}/#organization` },
        inLanguage: locale,
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'Site navigation',
        url: SEO_BASE_URL,
        hasPart: [
          { '@type': 'SiteNavigationElement', name: 'Tours', url: localizedAbsoluteUrl(locale, '/tours') },
          { '@type': 'SiteNavigationElement', name: 'Destinations', url: localizedAbsoluteUrl(locale, '/destinations') },
          { '@type': 'SiteNavigationElement', name: 'Blog', url: localizedAbsoluteUrl(locale, '/blog') },
          { '@type': 'SiteNavigationElement', name: 'Mobile App', url: localizedAbsoluteUrl(locale, '/mobile-app') },
        ],
      },
      ...(breadcrumbItems.length > 0
        ? [{
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              item: localizedAbsoluteUrl(locale, item.url),
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
