// app/api/admin/destinations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination, { type IDestination } from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import mongoose from 'mongoose';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { autoTranslateDestination } from '@/lib/i18n/autoTranslate';
import { normalizeDestinationSlug } from '@/lib/admin/destinationDeduplication';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const data = await request.json();
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
    if ('breadcrumbLabel' in navigation) updateData.breadcrumbLabel = navigation.breadcrumbLabel;
    if ('parentPage' in navigation) updateData.parentPage = navigation.parentPage;
    
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
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
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
      message: 'Destination updated successfully'
    });

  } catch (error: unknown) {
    console.error('Error updating destination:', error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid destination ID'
      }, { status: 400 });
    }

    // Check if destination has tours
    const destinationExists = await Destination.exists({ _id: id, ...DEFAULT_TENANT_FILTER });
    if (!destinationExists) return NextResponse.json({ success: false, error: 'Destination not found' }, { status: 404 });
    const tourCount = await Tour.countDocuments({ destination: id, ...DEFAULT_TENANT_FILTER });
    if (tourCount > 0) {
      if (!force) {
        return NextResponse.json({
          success: false,
          error: `Cannot delete destination. It has ${tourCount} tours associated with it. Use force=true to unlink tours and delete.`,
          tourCount
        }, { status: 400 });
      }

      // If force delete, unlink tours from this destination
      await Tour.updateMany(
        { destination: id, ...DEFAULT_TENANT_FILTER },
        { $unset: { destination: "" } }
      );
    }

    const destination = await Destination.findOneAndDelete({ _id: id, ...DEFAULT_TENANT_FILTER });

    if (!destination) {
      return NextResponse.json({
        success: false,
        error: 'Destination not found'
      }, { status: 404 });
    }

    revalidateStorefrontContent();

    return NextResponse.json({
      success: true,
      message: force && tourCount > 0
        ? `Destination deleted successfully. ${tourCount} tours were unlinked.`
        : 'Destination deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting destination:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete destination'
    }, { status: 500 });
  }
}
