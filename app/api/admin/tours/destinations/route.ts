// app/api/admin/destinations/route.ts
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import { NextRequest, NextResponse } from 'next/server';
import { MongoError } from 'mongodb';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import Tour from '@/lib/models/Tour';
import {
  dedupeAdminDestinations,
  normalizeDestinationSlug,
} from '@/lib/admin/destinationDeduplication';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  try {
    const [destinations, tours] = await Promise.all([
      // Default-tenant scope on both destinations and tour counts so
      // German-tenant variants don't leak into the EEO admin.
      Destination.find({ ...DEFAULT_TENANT_FILTER }).sort({ name: 1 }).lean(),
      Tour.find({ ...DEFAULT_TENANT_FILTER }).select('destination').lean(),
    ]);
    const tourCounts: Record<string, number> = {};
    tours.forEach((tour) => {
      const destId = tour.destination?.toString();
      if (destId) {
        tourCounts[destId] = (tourCounts[destId] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      data: dedupeAdminDestinations(destinations, tourCounts),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  try {
    const body = await request.json();
   
    // Only name and description are required
    const requiredFields = ['name', 'description'];
    const missingFields = requiredFields.filter(field => !body[field]?.trim?.());
   
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }
   
    // Auto-generate slug if not provided
    if (!body.slug && body.name) {
      body.slug = normalizeDestinationSlug(body.name);
    }

    if (body.slug) {
      body.slug = normalizeDestinationSlug(body.slug);
    }

    const duplicateQuery: Array<Record<string, string>> = [];
    if (body.slug) duplicateQuery.push({ slug: String(body.slug) });
    if (body.name) duplicateQuery.push({ name: String(body.name).trim() });

    if (duplicateQuery.length > 0) {
      const existingDestination = await Destination.findOne({ $or: duplicateQuery }).collation({
        locale: 'en',
        strength: 2,
      });

      if (existingDestination) {
        return NextResponse.json({
          success: false,
          error: `Destination "${body.name || body.slug}" already exists.`,
        }, { status: 409 });
      }
    }
   
    // Clean up coordinates if they're empty strings
    if (body.coordinates) {
      if (!body.coordinates.lat || body.coordinates.lat === '') {
        delete body.coordinates.lat;
      } else {
        body.coordinates.lat = parseFloat(body.coordinates.lat);
      }
      
      if (!body.coordinates.lng || body.coordinates.lng === '') {
        delete body.coordinates.lng;
      } else {
        body.coordinates.lng = parseFloat(body.coordinates.lng);
      }
      
      // Remove coordinates object if both lat and lng are missing
      if (!body.coordinates.lat && !body.coordinates.lng) {
        delete body.coordinates;
      }
    }
   
    // Filter out empty array items and empty strings
    const arrayFields = ['highlights', 'thingsToDo', 'localCustoms', 'languagesSpoken', 'weatherWarnings', 'tags'];
    arrayFields.forEach(field => {
      if (body[field]) {
        body[field] = body[field].filter((item: string) => item && item.trim());
      }
    });
   
    const destination = await Destination.create(body);
    return NextResponse.json({ success: true, data: destination }, { status: 201 });
   
  } catch (error) {
    if ((error as MongoError).code === 11000) {
      const field = Object.keys((error as any).keyValue)[0];
      return NextResponse.json({ success: false, error: `Destination with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
