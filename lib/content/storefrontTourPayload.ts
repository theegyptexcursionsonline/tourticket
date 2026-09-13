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
    rating: tour.rating,
    reviewCount: tour.reviewCount,
    duration: tour.duration,
    isFeatured: tour.isFeatured,
    createdAt: tour.createdAt,
    destination,
    categories,
  };
}
