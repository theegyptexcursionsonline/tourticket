import React from 'react';

import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import {
  STOREFRONT_TOOL_BRAND,
  absoluteToolUrl,
  type OfficialTool,
} from '@/lib/tools/catalog';

function JsonLd({ value }: { value: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(value) }}
    />
  );
}

export function ToolPageStructuredData({ locale, tool }: { locale: string; tool: OfficialTool }) {
  const pageUrl = absoluteToolUrl(locale, tool.id);
  return (
    <JsonLd
      value={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            name: tool.name,
            description: tool.description,
            url: pageUrl,
            applicationCategory: 'TravelApplication',
            operatingSystem: 'Any web browser',
            isAccessibleForFree: true,
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            provider: {
              '@type': 'Organization',
              name: STOREFRONT_TOOL_BRAND.name,
              url: STOREFRONT_TOOL_BRAND.origin,
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: STOREFRONT_TOOL_BRAND.origin,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Travel tools',
                item: absoluteToolUrl(locale),
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: tool.name,
                item: pageUrl,
              },
            ],
          },
        ],
      }}
    />
  );
}
