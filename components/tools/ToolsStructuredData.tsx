import React from 'react';

import { serializeJsonLd } from '@/lib/security/serializeJsonLd';
import {
  OFFICIAL_TOOLS,
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

export function ToolsCatalogStructuredData({ locale }: { locale: string }) {
  return (
    <JsonLd
      value={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Free Egypt travel planning tools',
        numberOfItems: OFFICIAL_TOOLS.length,
        itemListElement: OFFICIAL_TOOLS.map((tool, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: tool.name,
          url: absoluteToolUrl(locale, tool.id),
        })),
      }}
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
            provider: {
              '@type': 'Organization',
              name: STOREFRONT_TOOL_BRAND.name,
              url: STOREFRONT_TOOL_BRAND.origin,
            },
          },
        ],
      }}
    />
  );
}
