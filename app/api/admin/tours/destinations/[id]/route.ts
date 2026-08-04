import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import mongoose from 'mongoose';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { normalizeDestinationSlug } from '@/lib/admin/destinationDeduplication';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';

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
    Object.assign(data, sanitizeContentNavigation(data));
    const { id } = await params;
    delete data.tenantId;
    delete data.$set;
    delete data.$unset;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid destination ID' 
      }, { status: 400 });
    }
    
    if (data.slug !== undefined) {
      data.slug = normalizeDestinationSlug(data.slug);
    }

    if (data.name && !data.slug) {
      data.slug = normalizeDestinationSlug(data.name);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'parentPage')) {
      const currentDestination = await Destination.findOne({ _id: id, ...DEFAULT_TENANT_FILTER })
        .select('slug')
        .lean<{ slug?: string } | null>();
      if (!currentDestination) {
        return NextResponse.json({ success: false, error: 'Destination not found' }, { status: 404 });
      }
      data.parentPage = await validateParentPageSelection({
        parentPage: data.parentPage,
        currentId: id,
        currentSlug: data.slug || currentDestination.slug,
        tenantFilter: DEFAULT_TENANT_FILTER,
      });
    }

    const duplicateQuery: Array<Record<string, string>> = [];
    if (data.slug) duplicateQuery.push({ slug: String(data.slug) });
    if (data.name) duplicateQuery.push({ name: String(data.name).trim() });

    if (duplicateQuery.length > 0) {
      const duplicateDestination = await Destination.findOne({
        _id: { $ne: id },
        $and: [DEFAULT_TENANT_FILTER, { $or: duplicateQuery }],
      }).collation({ locale: 'en', strength: 2 });

      if (duplicateDestination) {
        return NextResponse.json({
          success: false,
          error: `Destination "${data.name || data.slug}" already exists.`,
        }, { status: 409 });
      }
    }

    const destination = await Destination.findOneAndUpdate(
      { _id: id, ...DEFAULT_TENANT_FILTER },
      data, 
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!destination) {
      return NextResponse.json({ 
        success: false, 
        error: 'Destination not found' 
      }, { status: 404 });
    }

    revalidateStorefrontContent();
    
    return NextResponse.json({ 
      success: true, 
      data: destination,
      message: 'Destination updated successfully' 
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
      error: 'Failed to update destination' 
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
    if (!destinationExists) {
      return NextResponse.json({ success: false, error: 'Destination not found' }, { status: 404 });
    }
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
