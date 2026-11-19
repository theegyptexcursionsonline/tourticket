import { compactPriceOptions } from '@/lib/pricing/effectivePrice';
type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;

const compactTaxonomyRef = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  return {
    _id: record._id == null ? undefined : String(record._id),
    name: record.name,
    slug: record.slug,
    icon: record.icon,
    urlType: record.urlType,
    parentPage: record.parentPage,
  };
};

/**
 * Keep only the fields rendered by a destination tour card or required by the
 * booking sidebar. Full catalogue records contain translations, itineraries,
 * FAQs and galleries that can multiply a destination response by megabytes.
 */
export function toDestinationTourPayload(tour: UnknownRecord): UnknownRecord {
  return {
    _id: tour._id == null ? undefined : String(tour._id),
    id: tour.id,
    title: tour.title,
    description: tour.description,
    slug: tour.slug,
    urlType: tour.urlType,
    parentPage: tour.parentPage,
    image: tour.image,
    pricingSummary: tour.pricingSummary,
    price: tour.price,
    discountPrice: tour.discountPrice,
    originalPrice: tour.originalPrice,
    discountPercent: tour.discountPercent,
    duration: tour.duration,
    rating: tour.rating,
    reviewCount: tour.reviewCount,
    reviews: tour.reviews,
    bookings: tour.bookings,
    isFeatured: tour.isFeatured,
    specialOffer: tour.specialOffer,
    fullyBooked: tour.fullyBooked,
    spotsLeft: tour.spotsLeft,
    location: tour.location,
    destination: compactTaxonomyRef(tour.destination),
    category: Array.isArray(tour.category)
      ? tour.category.map(compactTaxonomyRef)
      : compactTaxonomyRef(tour.category),
    availability: tour.availability,
    bookingOptions: tour.bookingOptions,
    addOns: tour.addOns,
    groupSize: tour.groupSize,
    maxGroupSize: tour.maxGroupSize,
    languages: tour.languages,
    instantConfirmation: tour.instantConfirmation,
    meetingPoint: tour.meetingPoint,
    operatedBy: tour.operatedBy,
    revenueGuestPrices: tour.revenueGuestPrices,
    tieredRefunds: tour.tieredRefunds,
    tags: tour.tags,
    includes: tour.includes,
    highlights: tour.highlights,
    whatsIncluded: tour.whatsIncluded,
    whatsNotIncluded: tour.whatsNotIncluded,
  };
}

/**
 * Database projection for category (catalogue) page tours. It holds every
 * field the page renders, the booking sidebar reads, and the localization
 * helpers score or translate (TOUR_LOCALE_FIELDS, `translations`, `tenantId`,
 * `isPublished`), so locale selection picks exactly the record it did before.
 * Itineraries, FAQs, galleries and policy text stay in the database.
 */
export const CATEGORY_TOUR_SELECT = [
  'title', 'description', 'longDescription', 'slug', 'urlType', 'parentPage',
  'image', 'pricingSummary', 'price', 'discountPrice', 'originalPrice',
  'discountPercent', 'duration', 'rating', 'reviewCount', 'reviews', 'bookings',
  'isFeatured', 'isPublished', 'specialOffer', 'fullyBooked', 'spotsLeft',
  'location', 'destination', 'category', 'availability', 'bookingOptions',
  'addOns', 'groupSize', 'maxGroupSize', 'languages', 'instantConfirmation',
  'meetingPoint', 'operatedBy', 'revenueGuestPrices', 'tieredRefunds',
  'bookingCutoffMinutes', 'pricingKey', 'tags', 'includes', 'highlights',
  'whatsIncluded', 'whatsNotIncluded', 'metaTitle', 'metaDescription',
  'translations', 'tenantId',
].join(' ');

/** Populated destination fields a category page needs (cards, popular destinations, links). */
export const CATEGORY_TOUR_DESTINATION_SELECT = 'name slug image urlType parentPage country description translations';

/** Populated category fields kept on each category-page tour. */
export const CATEGORY_TOUR_CATEGORY_SELECT = 'name slug icon urlType parentPage translations';

const categoryPageDestinationRef = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) return value;

  return {
    _id: record._id == null ? undefined : String(record._id),
    name: record.name,
    slug: record.slug,
    image: record.image,
    urlType: record.urlType,
    parentPage: record.parentPage,
  };
};

/**
 * Category pages render a tour card per trip and open the booking sidebar on
 * the same record. Send exactly that contract in the visitor's language: no
 * `translations` map, no itinerary/FAQ/gallery, and compact destination and
 * category references instead of the full populated documents.
 */
export function toCategoryTourPayload(tour: UnknownRecord): UnknownRecord {
  return {
    ...toDestinationTourPayload(tour),
    destination: categoryPageDestinationRef(tour.destination),
    category: Array.isArray(tour.category)
      ? tour.category.map(compactTaxonomyRef)
      : compactTaxonomyRef(tour.category),
    bookingCutoffMinutes: tour.bookingCutoffMinutes,
    pricingKey: tour.pricingKey,
  };
}

/** Compact card/search payload for the all-tours client grid. */
export function toToursIndexPayload(tour: UnknownRecord): UnknownRecord {
  const destination = compactTaxonomyRef(tour.destination);
  const categories = Array.isArray(tour.categories)
    ? tour.categories.map(compactTaxonomyRef)
    : tour.category
      ? [compactTaxonomyRef(tour.category)]
      : [];

  return {
    _id: tour._id == null ? undefined : String(tour._id),
    title: tour.title,
    description: tour.description,
    slug: tour.slug,
    urlType: tour.urlType,
    parentPage: tour.parentPage,
    image: tour.image,
    pricingSummary: tour.pricingSummary,
    discountPrice: tour.discountPrice,
    originalPrice: tour.originalPrice,
    discountPercent: tour.discountPercent,
    // The option prices the card needs to show the trip page figure.
    bookingOptions: compactPriceOptions(tour.bookingOptions),
    rating: tour.rating,
    reviewCount: tour.reviewCount,
    duration: tour.duration,
    isFeatured: tour.isFeatured,
    createdAt: tour.createdAt,
    destination,
    categories,
  };
}

/**
 * Drop the every-language `translations` map from a record that has already
 * been localized for the visitor, before it is handed to a client component.
 */
export function withoutTranslations<T extends UnknownRecord>(entry: T): Omit<T, 'translations'> {
  const { translations: _translations, ...rest } = entry;
  void _translations;
  return rest;
}
