// app/api/admin/destinations/[id]/route.ts
import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination, { type IDestination } from '@/lib/models/Destination';
import mongoose from 'mongoose';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { autoTranslateDestination } from '@/lib/i18n/autoTranslate';
import { normalizeDestinationSlug } from '@/lib/admin/destinationDeduplication';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';
import { deleteDestinationFromAlgolia } from '@/lib/algolia';
import { auditStamp } from '@/lib/admin/auditStamp';

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const data = await request.json();
    const restoreFromTrash = data.restoreFromTrash === true;
    delete data.restoreFromTrash;
    // Lifecycle metadata is server-owned. A client can only use the explicit
    // restore operation below, never forge who or when a record was removed.
    delete data.archivedAt;
    delete data.archivedBy;
    delete data.createdBy;
    delete data.updatedBy;
    const navigation = sanitizeContentNavigation(data);
    delete data.tenantId;
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid destination ID'
      }, { status: 400 });
    }

    // Find the existing destination first
    const existingDestination = await Destination.findOne({ _id: id, ...DEFAULT_TENANT_FILTER });
    if (!existingDestination) {
      return NextResponse.json({ 
        success: false, 
        error: 'Destination not found' 
      }, { status: 404 });
    }
    
    // Validate required fields - only name and description are required
    const requiredFields = ['name', 'description'];
    const missingFields = requiredFields.filter(field => {
      if (data[field] !== undefined) {
        return !data[field]?.trim?.();
      }
      return !existingDestination[field]?.trim?.();
    });
   
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }
    
    // Prepare update data - only update fields that are provided
    const updateData: Partial<IDestination> = {};
    if (restoreFromTrash) {
      updateData.archivedAt = null;
      updateData.archivedBy = null;
      updateData.isPublished = false;
    }
    if ('breadcrumbLabel' in navigation) updateData.breadcrumbLabel = navigation.breadcrumbLabel;
    if ('parentPage' in navigation) {
      updateData.parentPage = await validateParentPageSelection({
        parentPage: navigation.parentPage,
        currentId: id,
        currentSlug: data.slug || existingDestination.slug,
        tenantFilter: DEFAULT_TENANT_FILTER,
      });
    }
    
    // Basic fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = normalizeDestinationSlug(data.slug);
    if (data.country !== undefined) updateData.country = data.country;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.longDescription !== undefined) updateData.longDescription = data.longDescription;
    
    // Media
    if (data.image !== undefined) updateData.image = data.image;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.imageMetadata !== undefined) updateData.imageMetadata = data.imageMetadata;
    
    // Location data
    if (data.coordinates !== undefined) {
      if (data.coordinates && typeof data.coordinates === 'object') {
        const coords: { lat?: number; lng?: number } = {};
        if (data.coordinates.lat !== undefined && data.coordinates.lat !== '') {
          coords.lat = parseFloat(data.coordinates.lat);
        }
        if (data.coordinates.lng !== undefined && data.coordinates.lng !== '') {
          coords.lng = parseFloat(data.coordinates.lng);
        }
        const lat = coords.lat ?? existingDestination.coordinates?.lat;
        const lng = coords.lng ?? existingDestination.coordinates?.lng;
        if (lat !== undefined && lng !== undefined) {
          updateData.coordinates = { lat, lng };
        } else {
          updateData.coordinates = undefined;
        }
      } else {
        updateData.coordinates = data.coordinates;
      }
    }
    
    // Practical information
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.bestTimeToVisit !== undefined) updateData.bestTimeToVisit = data.bestTimeToVisit;
    
    // Content arrays
    type DestinationArrayField = 'highlights' | 'thingsToDo' | 'localCustoms' | 'languagesSpoken' | 'weatherWarnings' | 'tags';
    const arrayFields: DestinationArrayField[] = ['highlights', 'thingsToDo', 'localCustoms', 'languagesSpoken', 'weatherWarnings', 'tags'];
    arrayFields.forEach(field => {
      if (data[field] !== undefined) {
        if (Array.isArray(data[field])) {
          updateData[field] = data[field].filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0);
        } else {
          updateData[field] = undefined;
        }
      }
    });
    
    // Travel information
    if (data.visaRequirements !== undefined) updateData.visaRequirements = data.visaRequirements;
    if (data.emergencyNumber !== undefined) updateData.emergencyNumber = data.emergencyNumber;
    
    // Climate & weather
    if (data.averageTemperature !== undefined) updateData.averageTemperature = data.averageTemperature;
    if (data.climate !== undefined) updateData.climate = data.climate;
    if (data.faqs !== undefined) updateData.faqs = Array.isArray(data.faqs) ? data.faqs : [];
    if (data.travelTips !== undefined) updateData.travelTips = Array.isArray(data.travelTips) ? data.travelTips : [];
    if (data.bestDealTourIds !== undefined) {
      updateData.bestDealTourIds = Array.isArray(data.bestDealTourIds)
        ? data.bestDealTourIds.filter((tourId: unknown) => typeof tourId === 'string' && mongoose.Types.ObjectId.isValid(tourId))
        : [];
    }
    if (data.topTourIds !== undefined) {
      const bestDealIds = new Set((updateData.bestDealTourIds || existingDestination.bestDealTourIds || []).map(String));
      updateData.topTourIds = Array.isArray(data.topTourIds)
        ? data.topTourIds.filter((tourId: unknown) => typeof tourId === 'string' && mongoose.Types.ObjectId.isValid(tourId) && !bestDealIds.has(tourId))
        : [];
    }
    
    // Status & meta - THIS IS THE KEY PART FOR FEATURED
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.isPublished !== undefined) {
      if (existingDestination.archivedAt && !restoreFromTrash && data.isPublished === true) {
        return NextResponse.json({
          success: false,
          error: 'Restore this destination from Trash before publishing it.',
        }, { status: 409 });
      }
      updateData.isPublished = restoreFromTrash ? false : data.isPublished;
    }
    if (data.tourCount !== undefined) updateData.tourCount = data.tourCount;
    if (data.urlType !== undefined) updateData.urlType = data.urlType;
    
    // SEO & meta
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
    if (data.translations !== undefined) updateData.translations = data.translations;
    
    // Auto-generate slug if name is updated but slug is not provided
    if (data.name && !data.slug) {
      updateData.slug = normalizeDestinationSlug(data.name);
    }

    const editor = auditStamp(auth);
    if (editor) updateData.updatedBy = editor;

    const duplicateQuery: Array<Record<string, string>> = [];
    if (updateData.slug) duplicateQuery.push({ slug: String(updateData.slug) });
    if (updateData.name) duplicateQuery.push({ name: String(updateData.name).trim() });

    if (duplicateQuery.length > 0) {
      const duplicateDestination = await Destination.findOne({
        _id: { $ne: id },
        $and: [DEFAULT_TENANT_FILTER, { $or: duplicateQuery }],
      }).collation({ locale: 'en', strength: 2 });

      if (duplicateDestination) {
        return NextResponse.json({
          success: false,
          error: `Destination "${updateData.name || updateData.slug}" already exists.`,
        }, { status: 409 });
      }
    }
    
    const destination = await Destination.findOneAndUpdate(
      { _id: id, ...DEFAULT_TENANT_FILTER },
      updateData, 
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );
    
    if (!destination) {
      return NextResponse.json({
        success: false,
        error: 'Destination not found after update'
      }, { status: 404 });
    }

    revalidateStorefrontContent();

    // Fire-and-forget: auto-translate in background
    autoTranslateDestination(id).catch(err =>
      console.error('Auto-translate destination failed:', err)
    );

    return NextResponse.json({
      success: true,
      data: destination,
      message: restoreFromTrash
        ? 'Destination restored to Draft.'
        : 'Destination updated successfully'
    });

  } catch (error: unknown) {
    console.error('Error updating destination:', error);

    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    
    if ((error as { code?: string | number }).code === 11000) {
      const field = Object.keys((error as { keyValue?: Record<string, unknown> }).keyValue || {})[0] || 'field';
      return NextResponse.json({ 
        success: false, 
        error: `${field} already exists` 
      }, { status: 400 });
    }
    
    if ((error as Error).name === 'ValidationError') {
      const messages = Object.values((error as { errors: Record<string, Error> }).errors).map((e) => e.message);
      return NextResponse.json({ 
        success: false, 
        error: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message || 'Failed to update destination'
    }, { status: 500 });
  }
}

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid destination ID'
      }, { status: 400 });
    }

    const destination = await Destination.findOneAndUpdate(
      { _id: id, ...DEFAULT_TENANT_FILTER },
      {
        $set: {
          isPublished: false,
          archivedAt: new Date(),
          archivedBy: auth.id,
        },
      },
      { new: true },
    );

    if (!destination) {
      return NextResponse.json({
        success: false,
        error: 'Destination not found'
      }, { status: 404 });
    }

    revalidateStorefrontContent();

    try {
      await deleteDestinationFromAlgolia(String(destination._id));
    } catch (algoliaError) {
      console.warn('Failed to remove trashed destination from search:', algoliaError);
    }

    return NextResponse.json({
      success: true,
      message: 'Destination moved to Trash. Linked tours were preserved.',
      data: { id: destination._id, archivedAt: destination.archivedAt },
    });

  } catch (error) {
    console.error('Error deleting destination:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to move destination to Trash'
    }, { status: 500 });
  }
}

export const PUT = withAdminAudit(PUTHandler);
export const DELETE = withAdminAudit(DELETEHandler);
