// Bridges a resolved ContentMatch to the right pure renderer + metadata.
// Every detail route (root catch-all, /tour, /experience, /destination,
// /destinations, /categories) funnels through here so behaviour stays uniform.
import React from 'react';
import { Metadata } from 'next';
import { ContentMatch } from '@/lib/content/resolveContentBySlug';
import { localizedContentPath } from '@/lib/content/contentUrl';
import { renderTourDetail, getTourMetadata } from '@/app/[locale]/[slug]/TourDetailContent';
import {
  renderDestinationDetail,
  getDestinationMetadata,
} from '@/app/[locale]/destinations/[slug]/DestinationDetailContent';
import {
  renderCategoryDetail,
  getCategoryMetadata,
} from '@/app/[locale]/categories/[slug]/CategoryDetailContent';

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
    default:
      return null;
  }
}

export async function getContentMatchMetadata(
  match: ContentMatch,
  locale: string
): Promise<Metadata | null> {
  const canonicalPath = localizedContentPath(match.type, match.slug, match.urlType, locale);
  switch (match.type) {
    case 'tour':
      return getTourMetadata(match.slug, locale, canonicalPath);
    case 'destination':
      return getDestinationMetadata(match.slug, locale, canonicalPath);
    case 'category':
      return getCategoryMetadata(match.slug, locale);
    default:
      return null;
  }
}
