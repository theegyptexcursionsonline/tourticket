// Pure renderer + metadata for attraction/landing pages ("Pages" in the
// admin). Every URL shape (default /attraction, direct, /tour, /experience,
// /destination) funnels through here via renderContentMatch.
import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionLandingPage from '@/components/AttractionLandingPage';
import dbConnect from '@/lib/dbConnect';
import AttractionPageModel from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import {
  ATTRACTION_PAGE_LOCALIZED_FIELDS,
  resolveAttractionPageTours,
  resolveLinkedPageCards,
} from '@/lib/attractionPages/pageContent';
import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import { attractionPageStructuredFields } from '@/lib/i18n/translationFields';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';
import { explicitContentLocales, metadataAlternates } from '@/lib/i18n/seoAlternates';

type PageRecord = Record<string, unknown>;

async function getAttractionPageData(slug: string, locale: string) {
  try {
    await dbConnect();

    const page = await AttractionPageModel.findOne({
      slug,
      pageType: 'attraction',
      ...DEFAULT_TENANT_FILTER,
      ...PUBLIC_CONTENT_FILTER,
    })
      .populate({ path: 'categoryId', model: Category, match: DEFAULT_TENANT_FILTER, select: 'name slug' })
      .lean();

    if (!page) return null;

    const plain = JSON.parse(JSON.stringify(page)) as PageRecord;
    const localized = localizeEntityFields(
      localizeStructuredEntries(plain, locale, attractionPageStructuredFields),
      locale,
      ATTRACTION_PAGE_LOCALIZED_FIELDS
    );

    const [{ tours, totalTours }, linkedPages] = await Promise.all([
      resolveAttractionPageTours(page as unknown as Parameters<typeof resolveAttractionPageTours>[0]),
      resolveLinkedPageCards(page as unknown as Parameters<typeof resolveLinkedPageCards>[0], locale),
    ]);

    return {
      ...localized,
      tours: JSON.parse(JSON.stringify(tours)),
      totalTours,
      linkedPages,
    } as PageRecord & { tours: unknown[]; totalTours: number };
  } catch (error) {
    console.error('Error fetching attraction page:', error);
    return null;
  }
}

export async function renderAttractionDetail(
  slug: string,
  locale: string
): Promise<React.ReactElement | null> {
  const page = await getAttractionPageData(slug, locale);
  if (!page) return null;

  type AttractionProps = React.ComponentProps<typeof AttractionLandingPage>;

  const attraction = {
    ...page,
    tours: page.tours ?? [],
    totalTours: page.totalTours ?? 0,
    reviews: page.reviews ?? [],
    showStats: page.showStats ?? true,
  } as unknown as AttractionProps['attraction'];

  return (
    <>
      <Header startSolid />
      <AttractionLandingPage
        attraction={attraction}
        linkedPages={(page.linkedPages as AttractionProps['linkedPages']) ?? []}
      />
      <Footer />
    </>
  );
}

export async function getAttractionMetadata(
  slug: string,
  locale: string,
  canonicalPath?: string
): Promise<Metadata | null> {
  const page = await getAttractionPageData(slug, locale);
  if (!page) return null;

  const title = (page.metaTitle as string) || `${page.title} | Egypt Excursions Online`;
  const description = (page.metaDescription as string) || (page.description as string);
  const heroImage = page.heroImage as string | undefined;
  const canonical = canonicalPath || `/attraction/${page.slug}`;
  const alternates = metadataAlternates(
    locale,
    canonical,
    explicitContentLocales(page, ['title', 'description']),
  );

  return {
    title,
    description,
    keywords: Array.isArray(page.keywords) ? (page.keywords as string[]).join(', ') : undefined,
    openGraph: {
      title,
      description,
      images: heroImage ? [heroImage] : [],
      type: 'website',
      url: alternates.canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: heroImage ? [heroImage] : [],
    },
    alternates,
    robots: { index: true, follow: true },
  };
}
