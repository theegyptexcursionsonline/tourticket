import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Tour from "@/lib/models/Tour";
import Destination from "@/lib/models/Destination";
import Category from "@/lib/models/Category";
import mongoose from "mongoose";
import { syncTourToAlgolia, deleteTourFromAlgolia } from "@/lib/algolia";
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { auditStamp } from '@/lib/admin/auditStamp';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';
import { finalizeAddOnAssignments, stripBookingOptionClientKeys } from '@/lib/admin/addOnAssignments';
import { ensureBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';
import { autoTranslateTour } from '@/lib/i18n/autoTranslate';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { bookingOptionCapacityError, cleanBookingOptions } from '@/lib/admin/cleanBookingOptions';
import { refreshTourPricingSummary } from '@/lib/revenue/pricingSummary';
import { revalidateTourStorefront } from '@/lib/storefront/revalidateTourStorefront';
import { hasOnlyConfiguredTimeSlots } from '@/lib/pricing/bookingOptionSlots';
import { TourTaxonomyOwnershipError, validateTourTaxonomyOwnership } from '@/lib/admin/tourTaxonomyOwnership';

// Helper function to find a tour by ID or Slug with safe population
async function findTour(identifier: string) {
    try {
        let tour;
        
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            tour = await Tour.findOne({ _id: identifier, ...DEFAULT_TENANT_FILTER });
        } else {
            tour = await Tour.findOne({ slug: identifier, ...DEFAULT_TENANT_FILTER });
        }

        if (!tour) {
            return null;
        }

        // Manually populate to avoid potential circular reference issues
        if (tour.category) {
            try {
                if (Array.isArray(tour.category)) {
                    const categories = await Category.find({ $and: [DEFAULT_TENANT_FILTER, { _id: { $in: tour.category } }] });
                    tour.category = categories;
                } else {
                    const category = await Category.findOne({ $and: [DEFAULT_TENANT_FILTER, { _id: tour.category }] });
                    tour.category = category;
                }
            } catch (err) {
                console.warn('Failed to populate category:', err);
            }
        }

        if (tour.destination) {
            try {
                const destination = await Destination.findOne({ $and: [DEFAULT_TENANT_FILTER, { _id: tour.destination }] });
                tour.destination = destination;
            } catch (err) {
                console.warn('Failed to populate destination:', err);
            }
        }

        // Note: attractions and interests are just arrays of IDs, no need to populate
        // They will be loaded as-is and the form will handle them

        return tour;
    } catch (error) {
        console.error('Error in findTour:', error);
        throw error;
    }
}

// GET a single tour by ID or Slug
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        await dbConnect();
        const { id } = await params;

        console.log('Fetching tour with ID:', id);

        const tour = await findTour(id);

        if (!tour) {
            console.log('Tour not found for ID:', id);
            return NextResponse.json({ success: false, message: "Tour not found" }, { status: 404 });
        }

        console.log('Tour found successfully');
        console.log('Tour attractions:', tour.attractions);
        console.log('Tour interests:', tour.interests);

        return NextResponse.json({ success: true, data: tour });
        
    } catch (error: unknown) {
        console.error('Error fetching tour:', error);
        return NextResponse.json({ 
            success: false, 
            message: (error as Error).message || 'Failed to fetch tour',
            error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}

// UPDATE a tour by ID or Slug
async function PUTHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        Object.assign(body, sanitizeContentNavigation(body));
        delete body.tenantId;
        delete body.$set;
        delete body.$unset;
        delete body.archivedAt;
        delete body.archivedBy;
        if (Object.prototype.hasOwnProperty.call(body, 'parentPage')) {
            const currentTour = await Tour.findOne({ _id: id, ...DEFAULT_TENANT_FILTER })
                .select('slug')
                .lean<{ slug?: string } | null>();
            if (!currentTour) {
                return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
            }
            body.parentPage = await validateParentPageSelection({
                parentPage: body.parentPage,
                currentId: id,
                currentSlug: body.slug || currentTour.slug,
                tenantFilter: DEFAULT_TENANT_FILTER,
            });
        }
        if (body.isPublished === true) {
            // Publishing is the explicit restore action for an archived tour.
            body.archivedAt = null;
            body.archivedBy = null;
        }
        if (body.restoreFromArchive === true) {
            // Restore without publishing: the tour returns to Draft, which is
            // what an editor wants when reviving something for further work.
            body.archivedAt = null;
            body.archivedBy = null;
            delete body.restoreFromArchive;
        }

        console.log('Updating tour with ID:', id);
        console.log('Request body:', body);

        // Record who made this edit (never blanked by a body that omits it).
        const editor = auditStamp(auth);
        if (editor) body.updatedBy = editor;
        delete body.createdBy;

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
            const keyedOptions = ensureBookingOptionPricingKeys(id, cleanedOptions);
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
            body.category = body.category.filter((id: string) => id && id.trim());
        }
        if (body.attractions && Array.isArray(body.attractions)) {
            body.attractions = body.attractions.filter((id: string) => id && id.trim());
        }
        if (body.interests && Array.isArray(body.interests)) {
            body.interests = body.interests.filter((id: string) => id && id.trim());
        }

        // Validate required fields only if they're being updated
        // For partial updates (like syncing relationships), we don't need all fields
        const isFullUpdate = body.title || body.description || body.duration || body.discountPrice;

        if (isFullUpdate) {
            // For full updates, ensure all required fields are present
            const hasCategory = Array.isArray(body.category) ? body.category.length > 0 : body.category;
            if (!body.title || !body.description || !body.duration || !body.discountPrice || !body.destination || !hasCategory) {
                return NextResponse.json({
                    success: false,
                    error: 'Missing required fields: title, description, duration, discountPrice, destination, at least one category'
                }, { status: 400 });
            }
        }

        // Validate ObjectIds only if they're provided
        if (body.destination && !mongoose.Types.ObjectId.isValid(body.destination)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid destination ID format'
            }, { status: 400 });
        }

        if (body.category) {
            if (Array.isArray(body.category)) {
                const invalidCategoryIds = body.category.filter((id: string) => !mongoose.Types.ObjectId.isValid(id));
                if (invalidCategoryIds.length > 0) {
                    return NextResponse.json({
                        success: false,
                        error: 'Invalid category ID format'
                    }, { status: 400 });
                }
            } else if (!mongoose.Types.ObjectId.isValid(body.category)) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid category ID format'
                }, { status: 400 });
            }
        }

        if (body.destination !== undefined || body.category !== undefined) {
            await validateTourTaxonomyOwnership({
                destination: body.destination,
                category: body.category,
            });
        }

        // Normalize availability only when the request actually sends it — a
        // partial update (archive/restore sends only its own fields) must never
        // replace a tour's real schedule with the daily/10:00 default.
        if (body.availability) {
            if (!body.availability.type) {
                body.availability.type = 'daily';
            }
            if (!body.availability.slots || body.availability.slots.length === 0) {
                body.availability.slots = [{ time: '10:00', capacity: 10 }];
            }
            if (!body.availability.availableDays) {
                body.availability.availableDays = [0, 1, 2, 3, 4, 5, 6];
            }
        }

        // Booking-option time slots are a strict subset of the tour's
        // universal availability. Enforce this on the API as well as in the
        // form so a direct or stale request cannot revive a removed slot.
        if (Array.isArray(body.bookingOptions)) {
            let availabilitySlots = body.availability?.slots;
            if (!Array.isArray(availabilitySlots)) {
                const currentTour = await Tour.findOne({ _id: id, ...DEFAULT_TENANT_FILTER })
                    .select('availability.slots')
                    .lean<{ availability?: { slots?: Array<{ time?: string }> } } | null>();
                if (!currentTour) {
                    return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
                }
                availabilitySlots = currentTour.availability?.slots || [];
            }
            const slotsAreValid = body.bookingOptions.every((option: { timeSlots?: Array<{ time?: string }> }) =>
                hasOnlyConfiguredTimeSlots(option?.timeSlots, availabilitySlots));
            if (!slotsAreValid) {
                return NextResponse.json({
                    success: false,
                    error: 'Booking option contains a time slot that is not in tour availability',
                }, { status: 400 });
            }
        }

        const updatedTour = await Tour.findOneAndUpdate(
            { _id: id, ...DEFAULT_TENANT_FILTER },
            { $set: body },
            {
                new: true,
                runValidators: true,
                upsert: false,
                strict: false
            }
        );

        if (!updatedTour) {
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        const pricingSummary = await refreshTourPricingSummary(id);
        if (pricingSummary) updatedTour.pricingSummary = pricingSummary;
        revalidateTourStorefront();

        console.log('Tour updated successfully');
        console.log('Updated tour attractions:', updatedTour.attractions);
        console.log('Updated tour interests:', updatedTour.interests);

        // Sync to Algolia if published
        if (updatedTour.isPublished) {
            try {
                await syncTourToAlgolia(updatedTour);
            } catch (algoliaErr) {
                console.warn('Failed to sync updated tour to Algolia:', algoliaErr);
            }
        } else {
            // Remove from Algolia if unpublished
            try {
                await deleteTourFromAlgolia(id);
            } catch (algoliaErr) {
                console.warn('Failed to remove tour from Algolia:', algoliaErr);
            }
        }

        // Fire-and-forget: auto-translate in background
        autoTranslateTour(id).catch(err =>
            console.error('Auto-translate tour failed:', err)
        );

        return NextResponse.json({ success: true, data: updatedTour });

    } catch (error: unknown) {
        console.error('Tour update error:', error);

        if (error instanceof ParentPageValidationError) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        if (error instanceof TourTaxonomyOwnershipError) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        
        if ((error as { code?: string | number }).code === 11000) {
            const field = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern || {})[0] || 'field';
            return NextResponse.json({ 
                success: false, 
                error: `A tour with this ${field} already exists` 
            }, { status: 409 });
        }
        
        if ((error as Error).name === 'ValidationError') {
            const validationErrors = Object.values((error as { errors: Record<string, Error> }).errors).map((err) => err.message);
            return NextResponse.json({ 
                success: false, 
                error: `Validation failed: ${validationErrors.join(', ')}` 
            }, { status: 400 });
        }

        if ((error as Error).name === 'CastError') {
            return NextResponse.json({ 
                success: false, 
                error: `Invalid ${(error as { path?: string }).path || 'value'}: ${String((error as { value?: unknown }).value)}`
            }, { status: 400 });
        }

        return NextResponse.json({ 
            success: false, 
            error: (error as Error).message || 'An unexpected error occurred while updating the tour'
        }, { status: 500 });
    }
}

// Archive a tour by ID or slug. Tour documents are referenced by immutable
// booking receipts, so permanent deletion would corrupt the financial trail.
async function DELETEHandler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        await dbConnect();
        const { id } = await params;

        let archivedTour;
        
        if (mongoose.Types.ObjectId.isValid(id)) {
            archivedTour = await Tour.findOneAndUpdate(
                { _id: id, ...DEFAULT_TENANT_FILTER },
                { $set: { isPublished: false, archivedAt: new Date(), archivedBy: auth.id } },
                { new: true },
            );
        } else {
            archivedTour = await Tour.findOneAndUpdate(
                { slug: id, ...DEFAULT_TENANT_FILTER },
                { $set: { isPublished: false, archivedAt: new Date(), archivedBy: auth.id } },
                { new: true },
            );
        }

        if (!archivedTour) {
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        revalidateTourStorefront();

        // Remove from Algolia
        try {
            await deleteTourFromAlgolia(String(archivedTour._id));
        } catch (algoliaErr) {
            console.warn('Failed to remove deleted tour from Algolia:', algoliaErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Tour archived. Existing bookings and audit records were preserved.',
            data: { id: archivedTour._id, archivedAt: archivedTour.archivedAt },
        });
        
    } catch (error: unknown) {
        console.error('Tour deletion error:', error);
        return NextResponse.json({ 
            success: false, 
            error: (error as Error).message || 'An unexpected error occurred while deleting the tour'
        }, { status: 500 });
    }
}

export const PUT = withAdminAudit(PUTHandler);
export const DELETE = withAdminAudit(DELETEHandler);
