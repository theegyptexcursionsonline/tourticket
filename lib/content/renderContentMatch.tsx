// Bridges a resolved ContentMatch to the right pure renderer + metadata.
// Every detail route (root catch-all, /tour, /experience, /destination,
// /destinations, /categories) funnels through here so behaviour stays uniform.
import React from 'react';
import { Metadata } from 'next';
import { ContentMatch } from '@/lib/content/resolveContentBySlug';
import { contentPath, attractionPagePath } from '@/lib/content/contentUrl';
import { renderTourDetail, getTourMetadata } from '@/app/[locale]/[slug]/TourDetailContent';
import {
  renderDestinationDetail,
  getDestinationMetadata,
} from '@/app/[locale]/destinations/[slug]/DestinationDetailContent';
import {
  renderCategoryDetail,
  getCategoryMetadata,
} from '@/app/[locale]/categories/[slug]/CategoryDetailContent';
import {
  renderAttractionDetail,
  getAttractionMetadata,
} from '@/app/[locale]/attraction/[slug]/AttractionDetailContent';
import {
  renderCataloguePage,
  getCataloguePageMetadata,
} from '@/app/[locale]/category/[category-name]/CataloguePageContent';

export async function renderContentMatch(
  match: ContentMatch,
  locale: string
): Promise<React.ReactElement | null> {
  switch (match.type) {
    case 'tour':
      return renderTourDetail(match.slug, locale);
    case 'destination':
      return renderDestinationDetail(match.slug, locale);
    case 'category':
      return renderCategoryDetail(match.slug, locale);
    case 'page':
      // One model, two kinds: catalogue pages render the catalogue template,
      // attraction pages the attraction one, at whatever URL shape they chose.
      return match.pageKind === 'category'
        ? renderCataloguePage(match.slug, locale)
        : renderAttractionDetail(match.slug, locale);
    default:
      return null;
  }
}

export async function getContentMatchMetadata(
  match: ContentMatch,
  locale: string
): Promise<Metadata | null> {
  // Locale-less on purpose: metadataAlternates() localizes the canonical and
  // hreflang set itself — passing a locale-prefixed path doubled the locale
  // (/de/de/…) on every non-default-locale detail page.
  const canonicalPath = match.type === 'page'
    ? attractionPagePath(match.slug, match.pageKind, match.urlType, match.citySlug, match.parentSlug)
    : contentPath(match.type, match.slug, match.urlType, match.citySlug, match.parentSlug);
  switch (match.type) {
    case 'tour':
      return getTourMetadata(match.slug, locale, canonicalPath);
    case 'destination':
      return getDestinationMetadata(match.slug, locale, canonicalPath);
    case 'category':
      return getCategoryMetadata(match.slug, locale, canonicalPath);
    case 'page':
      return match.pageKind === 'category'
        ? getCataloguePageMetadata(match.slug, locale, canonicalPath)
        : getAttractionMetadata(match.slug, locale, canonicalPath);
    default:
      return null;
  }
}
