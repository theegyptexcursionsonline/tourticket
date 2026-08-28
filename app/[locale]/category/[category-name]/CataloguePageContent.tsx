// Pure loader + renderer for catalogue pages (AttractionPage, pageType
// 'category'), shared by the fixed /category/{slug} route and the urlType
// resolver (renderContentMatch) so a catalogue page renders identically at
// whichever URL shape its admin chose.
import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionPageTemplate from '@/components/AttractionPageTemplate';
import { CategoryPageData } from '@/types';
import dbConnect from '@/lib/dbConnect';
import AttractionPageModel from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import {
  ATTRACTION_PAGE_LOCALIZED_FIELDS,
  resolveAttractionPageTours,
  resolveLinkedPageCards,
} from '@/lib/attractionPages/pageContent';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';
import { explicitContentLocales, metadataAlternates } from '@/lib/i18n/seoAlternates';

export async function getCataloguePage(slug: string, locale: string): Promise<CategoryPageData | null> {
  try {
    await dbConnect();

    const page = await AttractionPageModel.findOne({
      slug,
      pageType: 'category',
      ...DEFAULT_TENANT_FILTER,
      ...PUBLIC_CONTENT_FILTER,
    })
    .populate({
      path: 'categoryId',
      model: Category,
      match: DEFAULT_TENANT_FILTER,
      select: 'name slug'
    })
    .lean();

    if (!page) {
      return null;
    }

    let serializedPage = JSON.parse(JSON.stringify(page));

    // Localize the page's own content (translations added with the unified
    // Pages section), then the linked category's fields below.
    serializedPage = localizeEntityFields(
      serializedPage as Record<string, unknown>,
      locale,
      ATTRACTION_PAGE_LOCALIZED_FIELDS
    );

    if (serializedPage.categoryId && typeof serializedPage.categoryId === 'object') {
      serializedPage.categoryId = localizeEntityFields(
        serializedPage.categoryId as Record<string, unknown>,
        locale,
        ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription']
      );
    }

    const [{ tours, totalTours }, linkedPages] = await Promise.all([
      resolveAttractionPageTours(page as unknown as Parameters<typeof resolveAttractionPageTours>[0]),
      resolveLinkedPageCards(page as unknown as Parameters<typeof resolveLinkedPageCards>[0], locale),
    ]);

    return {
      ...serializedPage,
      tours: JSON.parse(JSON.stringify(tours)),
      totalTours,
      linkedPages,
    };
  } catch (error) {
    console.error('Error fetching category page:', error);
    return null;
  }
}

export async function renderCataloguePage(slug: string, locale: string): Promise<React.ReactElement | null> {
  const page = await getCataloguePage(slug, locale);
  if (!page) return null;

  return (
    <>
      <Header />
      <AttractionPageTemplate
        page={page}
        urlType="category"
        linkedPages={page.linkedPages || []}
      />
      <Footer />
    </>
  );
}

export async function getCataloguePageMetadata(
  slug: string,
  locale: string,
  canonicalPath?: string,
): Promise<Metadata | null> {
  const page = await getCataloguePage(slug, locale);
  if (!page) return null;

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.description,
    keywords: page.keywords?.join(', '),
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: [page.heroImage],
      type: 'website',
    },
    alternates: metadataAlternates(
      locale,
      canonicalPath || `/category/${page.slug}`,
      explicitContentLocales(page, ['title', 'description']),
    ),
  };
}
