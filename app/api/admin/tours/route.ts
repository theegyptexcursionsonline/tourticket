// app/api/admin/tours/route.ts
import { withAdminAudit } from '@/lib/admin/adminAudit';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { syncTourToAlgolia } from '@/lib/algolia';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { autoTranslateTour } from '@/lib/i18n/autoTranslate';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { bookingOptionCapacityError, cleanBookingOptions } from '@/lib/admin/cleanBookingOptions';
import { refreshTourPricingSummary } from '@/lib/revenue/pricingSummary';
import { revalidateTourStorefront } from '@/lib/storefront/revalidateTourStorefront';
import { ensureBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';
import { collectTourOptionIds } from '@/lib/admin/tourOptionIdentifiers';
import { auditStamp } from '@/lib/admin/auditStamp';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';
import { finalizeAddOnAssignments, stripBookingOptionClientKeys } from '@/lib/admin/addOnAssignments';
import { TourTaxonomyOwnershipError, validateTourTaxonomyOwnership } from '@/lib/admin/tourTaxonomyOwnership';

const ADMIN_TOUR_LIST_PROJECTION = [
  'title',
  'slug',
  'urlType',
  'price',
  'originalPrice',
  'discountPrice',
  'isPublished',
  'isFeatured',
  'image',
  'thumbnail',
  'category',
  'destination',
  'duration',
  'rating',
  'reviews',
  'bookingOptions._id',
  'bookingOptions.id',
  'bookingOptions.pricingKey',
  'tenantId',
  'createdAt',
  'updatedAt',
  'archivedAt',
  'createdBy',
  'updatedBy',
].join(' ');

function addReviewCounts(tours: unknown[]) {
  return tours.map((tour) => {
    if (!tour || typeof tour !== 'object') return tour;
    const { reviews, bookingOptions, ...listFields } = tour as Record<string, unknown>;
    return {
      ...listFields,
      reviewCount: Array.isArray(reviews) ? reviews.length : 0,
      optionIds: collectTourOptionIds(bookingOptions),
    };
  });
}

async function fetchToursWithPopulate(extraFilter: Record<string, unknown> = {}) {
  // Scope the EEO admin tours API to the default tenant — other tenants
  // (e.g. German aegypten-ausfluege) have their own admin and must not
  // appear in this response. Any caller filter is composed on top of the
  // tenant scope, never in place of it.
  const tenantFilter = { ...DEFAULT_TENANT_FILTER, ...extraFilter };
  try {
    const tours = await Tour.find(tenantFilter)
      .select(ADMIN_TOUR_LIST_PROJECTION)
      .populate({ path: 'category', select: 'name title slug', match: DEFAULT_TENANT_FILTER })
      .populate({ path: 'destination', select: 'name title slug', match: DEFAULT_TENANT_FILTER })
      .sort({ createdAt: -1 })
      .lean();
    return addReviewCounts(tours);
  } catch (err) {
    console.warn('Populate failed, retrying with strictPopulate:false', err);
    const tours = await Tour.find(tenantFilter)
      .select(ADMIN_TOUR_LIST_PROJECTION)
      .populate({ path: 'category', select: 'name title slug', match: DEFAULT_TENANT_FILTER, strictPopulate: false })
      .populate({ path: 'destination', select: 'name title slug', match: DEFAULT_TENANT_FILTER, strictPopulate: false })
      .sort({ createdAt: -1 })
      .lean();
    return addReviewCounts(tours);
  }
}

// GET all tours
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    // Trashed (archived) tours are returned by default because the Manage
    // Tours list renders them under its Trash tab. Pickers that link tours to
    // other content (destinations) opt out with includeArchived=false so a
    // trashed tour can never be selected for a live listing.
    const includeArchived = new URL(request.url).searchParams.get('includeArchived');
    const tours = await fetchToursWithPopulate(includeArchived === 'false' ? { archivedAt: null } : {});

    return NextResponse.json({ success: true, data: tours }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tours:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST a new tour
async function POSTHandler(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  
  try {
    const body = await request.json();
    Object.assign(body, sanitizeContentNavigation(body));
    const tourId = randomBytes(12).toString('hex');
    body._id = tourId;
    body.tenantId = 'default';
    delete body.$set;
    delete body.$unset;
    body.parentPage = await validateParentPageSelection({
      parentPage: body.parentPage,
      currentId: tourId,
      currentSlug: body.slug,
      tenantFilter: DEFAULT_TENANT_FILTER,
    });
    
    // Map 'faqs' from form to 'faq' in the database model
    if (body.faqs) {
      body.faq = body.faqs;
      delete body.faqs;
    }

    // Clean booking options to remove invalid enum values
    if (body.bookingOptions && Array.isArray(body.bookingOptions)) {
      const cleanedOptions = cleanBookingOptions(body.bookingOptions);
      const capacityError = bookingOptionCapacityError(cleanedOptions);
      if (capacityError) {
        return NextResponse.json({ error: capacityError }, { status: 400 });
      }
      const keyedOptions = ensureBookingOptionPricingKeys(
        String(tourId),
        cleanedOptions,
      );
      body.addOns = finalizeAddOnAssignments(body.addOns, keyedOptions || []);
      body.bookingOptions = stripBookingOptionClientKeys(keyedOptions || []);
    }

    // Clean main tour difficulty field
    if (body.difficulty !== undefined) {
      const validDifficulties = ['Easy', 'Moderate', 'Challenging', 'Difficult'];
      if (!body.difficulty || !validDifficulties.includes(body.difficulty)) {
        body.difficulty = 'Easy'; // Default to 'Easy' if invalid
      }
    }

    // Handle category, attractions and interests arrays
    if (body.category && Array.isArray(body.category)) {
      body.category = body.category.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0);
    }
    if (body.attractions && Array.isArray(body.attractions)) {
      body.attractions = body.attractions.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0);
    }
    if (body.interests && Array.isArray(body.interests)) {
      body.interests = body.interests.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0);
    }

    await validateTourTaxonomyOwnership({
      destination: body.destination,
      category: body.category,
    });

    const author = auditStamp(auth);
    if (author) {
      body.createdBy = author;
      body.updatedBy = author;
    }

    const tour = await Tour.create(body);
    await refreshTourPricingSummary(String(tour._id));
    revalidateTourStorefront();
    
    let populated: unknown = tour;
    try {
      populated = await Tour.findById(tour._id)
        .populate({ path: 'category', match: DEFAULT_TENANT_FILTER })
        .populate({ path: 'destination', match: DEFAULT_TENANT_FILTER })
        .populate('reviews')
        .populate('attractions')
        .populate('interests')
        .lean();
    } catch (popErr) {
      console.warn('Populate after create failed, returning raw tour', popErr);
    }

    // Sync to Algolia if published
    if (body.isPublished) {
      try {
        await syncTourToAlgolia((populated ?? tour) as Parameters<typeof syncTourToAlgolia>[0]);
      } catch (algoliaErr) {
        console.warn('Failed to sync tour to Algolia:', algoliaErr);
        // Don't fail the request if Algolia sync fails
      }
    }

    // Fire-and-forget: auto-translate in background
    autoTranslateTour(String(tour._id)).catch(err =>
      console.error('Auto-translate tour failed:', err)
    );

    return NextResponse.json({ success: true, data: populated ?? tour }, { status: 201 });
  } catch (error) {
    if (error instanceof TourTaxonomyOwnershipError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error creating tour:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export const POST = withAdminAudit(POSTHandler);
