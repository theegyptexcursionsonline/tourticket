import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import TourModel from '@/lib/models/Tour';
import DestinationModel from '@/lib/models/Destination';
import ReviewModel from '@/lib/models/Review';
import {
  cityFromParam,
  clampOfferEnd,
  looksLikeCampaignCode,
  sanitizeOfferName,
  tourDisplayPricing,
} from '@/lib/offer/campaign';
import OfferPageClient, { type OfferTour, type OfferView } from './OfferPageClient';
import { OFFER_FONT_CLASS } from './fonts';
import { PRIVATE_ROUTE_METADATA } from '@/lib/seo/privateRouteMetadata';

// Personal and time-boxed: never cached, never indexed.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  ...PRIVATE_ROUTE_METADATA,
  title: 'Your private offer | Egypt Excursions Online',
};

// Catalog entries priced below this are data-entry errors, not offers.
const MIN_CREDIBLE_PRICE = 5;
// Client decision 14/08: exactly three bundle listings on every offer page.
const BUNDLE_COUNT = 3;
const PICK_COUNT = 8;
const QUOTE_COUNT = 3;

// The single-tenant catalogue: rows tagged 'default' or predating tenancy.
const TENANT_FILTER = { $or: [{ tenantId: 'default' }, { tenantId: { $exists: false } }] };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EEO = {
  siteName: 'Egypt Excursions Online',
  logo: '/EEO-logo.png',
  brandColor: '#dc2626',
  whatsapp: '201142255624', // the number published in the site footer
};

function ClosedOffer({ title, body, reason }: { title: string; body: string; reason: string }) {
  return (
    <main
      data-offer-state={reason}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-900 px-6"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.12),transparent_70%)]" />
      <div className="relative max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-sm">
        <h1 className="text-2xl font-extrabold text-white">{title}</h1>
        <p className="mt-3 leading-relaxed text-white/70">{body}</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-100">
          Browse all tours
        </Link>
      </div>
    </main>
  );
}

export default async function OfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ name?: string; city?: string; ends?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const locale = await getLocale();
  const raw = decodeURIComponent(token);

  if (!looksLikeCampaignCode(raw)) {
    return (
      <ClosedOffer
        reason="bad_link"
        title="This link isn't valid"
        body="Please use the exact link your tour planner sent you, or ask them for a fresh one."
      />
    );
  }

  await dbConnect();

  // The Discount record is the sole authority — the same checks checkout runs.
  const record = await Discount.findOne({ code: raw.toUpperCase() }).lean() as
    | { code: string; discountType: 'percentage' | 'fixed'; value: number; isActive: boolean; expiresAt?: Date; usageLimit?: number; timesUsed: number }
    | null;
  if (!record) {
    return (
      <ClosedOffer
        reason="bad_link"
        title="This link isn't valid"
        body="Please use the exact link your tour planner sent you, or ask them for a fresh one."
      />
    );
  }
  const firstName = sanitizeOfferName(query.name);
  const codeAlive = record.isActive
    && (!record.expiresAt || new Date(record.expiresAt) >= new Date())
    && (!record.usageLimit || record.timesUsed < record.usageLimit);
  if (!codeAlive) {
    return (
      <ClosedOffer
        reason="code_inactive"
        title={firstName ? `${firstName}, this code is no longer active` : 'This code is no longer active'}
        body="Your planner's discount can't be applied right now. Message them for a new one — the tours are still available at standard prices."
      />
    );
  }

  const discount = { discountType: record.discountType, value: Number(record.value) };
  const end = clampOfferEnd(query.ends, record.expiresAt ? new Date(record.expiresAt) : null);
  const expiresAt = end ? end.toISOString() : null;
  const expiresNice = end ? `${end.getUTCDate()} ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}` : null;

  // City scope: every destination slug the city owns, old and new.
  const city = cityFromParam(query.city);
  let destinationIds: unknown[] | null = null;
  let cityHero: string | null = null;
  if (city) {
    const destinations = await DestinationModel.find({ slug: { $in: city.slugs }, ...TENANT_FILTER })
      .select('_id image images')
      .lean();
    destinationIds = destinations.map((d: any) => d._id);
    cityHero = destinations.map((d: any) => d.image || d.images?.[0]).find(Boolean) || null;
  }

  const tourQuery: Record<string, unknown> = { isPublished: true, ...TENANT_FILTER };
  if (destinationIds) tourQuery.destination = { $in: destinationIds };
  const tours = await TourModel.find(tourQuery)
    .select('title slug description shortDescription price discountPrice duration image isFeatured destination highlights')
    .limit(200)
    .lean();

  // Real social proof only: aggregates over actual review documents.
  const tourIds = tours.map((tour: any) => tour._id);
  const [reviewAgg, quoteDocs] = await Promise.all([
    ReviewModel.aggregate([
      { $match: { tour: { $in: tourIds } } },
      { $group: { _id: '$tour', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
    ReviewModel.find({ tour: { $in: tourIds }, rating: 5, comment: { $exists: true, $ne: '' } })
      .sort({ createdAt: -1 })
      .limit(QUOTE_COUNT * 8)
      .select('userName rating comment tour')
      .lean(),
  ]);
  const reviewStats = new Map<string, { avg: number; count: number }>(
    reviewAgg.map((row: any) => [String(row._id), { avg: Number(row.avg), count: Number(row.count) }]),
  );
  const titleById = new Map<string, string>(tours.map((tour: any) => [String(tour._id), String(tour.title)]));
  const seenTours = new Set<string>();
  const quotes = (quoteDocs as any[])
    .filter((review) => {
      const key = String(review.tour);
      if (seenTours.has(key)) return false;
      seenTours.add(key);
      return true;
    })
    .map((review) => ({
      name: String(review.userName || 'Verified traveller'),
      rating: Number(review.rating),
      text: String(review.comment || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      tourTitle: titleById.get(String(review.tour)) || null,
    }))
    .filter((quote) => quote.text.length > 30)
    .slice(0, QUOTE_COUNT);

  const sellable = tours
    .map((tour: any): OfferTour | null => {
      const listPrice = Number(tour.discountPrice ?? tour.price ?? 0);
      if (!Number.isFinite(listPrice) || listPrice < MIN_CREDIBLE_PRICE) return null;
      if (!tour.slug || !tour.title) return null;
      const pricing = tourDisplayPricing(listPrice, discount);
      const stats = reviewStats.get(String(tour._id));
      // Benefit bullets are real product facts only: actual Tour.highlights,
      // cleaned of markup, capped so the card stays scannable.
      const highlights = Array.isArray(tour.highlights)
        ? tour.highlights
            .map((line: unknown) =>
              String(line ?? '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim(),
            )
            .filter((line: string) => line.length >= 3 && line.length <= 90)
            .slice(0, 4)
        : [];
      const summary = String(tour.description || tour.shortDescription || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        id: String(tour._id),
        title: String(tour.title),
        slug: String(tour.slug),
        summary,
        image: tour.image ? String(tour.image) : null,
        duration: tour.duration ? String(tour.duration) : null,
        listPrice,
        offerPrice: pricing.offerPrice,
        saving: pricing.saving,
        perTourDiscount: pricing.perTourDiscount,
        rating: stats && stats.count > 0 ? Number(stats.avg.toFixed(1)) : null,
        reviewCount: stats?.count ?? 0,
        isFeatured: Boolean(tour.isFeatured),
        highlights,
      };
    })
    .filter((tour): tour is OfferTour => tour !== null);

  if (sellable.length === 0) {
    return (
      <ClosedOffer
        reason="no_tours"
        title="We couldn't load tours just now"
        body="Your code is still valid — refresh in a moment, or message your planner."
      />
    );
  }

  const byValue = [...sellable].sort((a, b) => a.offerPrice - b.offerPrice);
  const bundleTarget = Math.min(BUNDLE_COUNT, Math.max(1, Math.floor(sellable.length / 2)));
  const bundles = byValue.slice(0, bundleTarget);
  const bundleIds = new Set(bundles.map((tour) => tour.id));
  const remaining = sellable.filter((tour) => !bundleIds.has(tour.id));
  const picks = [
    ...remaining.filter((tour) => tour.isFeatured),
    ...remaining.filter((tour) => !tour.isFeatured).sort((a, b) => b.offerPrice - a.offerPrice),
  ].slice(0, PICK_COUNT);

  const reviewTotal = reviewAgg.reduce((sum: number, row: any) => sum + Number(row.count), 0);
  const ratingSum = reviewAgg.reduce((sum: number, row: any) => sum + Number(row.avg) * Number(row.count), 0);

  const view: OfferView = {
    firstName,
    code: record.code,
    label: record.discountType === 'percentage' ? `${record.value}%` : `$${record.value}`,
    perTourDiscount: record.discountType === 'percentage',
    expiresAt,
    expiresNice,
    currencySymbol: '$',
    siteName: EEO.siteName,
    logo: EEO.logo,
    brandColor: EEO.brandColor,
    heroImage: cityHero || bundles[0]?.image || picks[0]?.image || null,
    heroAlt: city ? `${city.label} experiences` : 'Egypt experiences',
    cityLabel: city?.label ?? null,
    bundles,
    picks,
    totalCount: sellable.length,
    stats: {
      fromPrice: Math.min(...sellable.map((tour) => tour.offerPrice)),
      maxSaving: Math.max(...sellable.map((tour) => tour.saving)),
      avgRating: reviewTotal > 0 ? Number((ratingSum / reviewTotal).toFixed(1)) : null,
      reviewTotal,
    },
    quotes,
    contact: { whatsapp: EEO.whatsapp },
  };

  return <OfferPageClient view={view} locale={locale} fontClass={OFFER_FONT_CLASS} />;
}
