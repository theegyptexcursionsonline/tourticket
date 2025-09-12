// app/api/admin/seed/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';

const generateSlug = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export async function POST(request: Request) {
  await dbConnect();
  
  try {
    const { destinations, categories, tours, wipeData } = await request.json();

    const report = {
      wipedData: false,
      destinationsCreated: 0,
      categoriesCreated: 0,
      toursCreated: 0,
      errors: [] as string[],
    };

    // 1. Conditionally Wipe Existing Data
    if (wipeData) {
      await Promise.all([
        Tour.deleteMany({}),
        Category.deleteMany({}),
        Destination.deleteMany({}),
      ]);
      report.wipedData = true;
    }

    // 2. Bulk Insert Destinations and Categories
    if (destinations?.length) {
      const destDocs = destinations.map((d: any) => ({ ...d, slug: generateSlug(d.name) }));
      const created = await Destination.insertMany(destDocs, { ordered: false });
      report.destinationsCreated = created.length;
    }
    if (categories?.length) {
      const catDocs = categories.map((c: any) => ({ ...c, slug: generateSlug(c.name) }));
      const created = await Category.insertMany(catDocs, { ordered: false });
      report.categoriesCreated = created.length;
    }

    // 3. Process and Insert Tours
    if (tours?.length) {
      // Fetch all destinations and categories to create a name -> _id map
      const allDestinations = await Destination.find({});
      const destinationMap = new Map(allDestinations.map(d => [d.name.toLowerCase(), d._id]));
      
      const allCategories = await Category.find({});
      const categoryMap = new Map(allCategories.map(c => [c.name.toLowerCase(), c._id]));

      const toursToInsert = [];
      for (const tourData of tours) {
        const { destinationName, categoryNames, ...restOfTourData } = tourData;
        
        const destId = destinationMap.get(destinationName?.toLowerCase());
        if (!destId) {
          report.errors.push(`Tour "${tourData.title}": Destination "${destinationName}" not found.`);
          continue;
        }

        const categoryIds = categoryNames?.map((name: string) => categoryMap.get(name.toLowerCase())).filter(Boolean);
        if (categoryIds.length !== categoryNames?.length) {
          report.errors.push(`Tour "${tourData.title}": One or more categories not found.`);
          continue;
        }

        toursToInsert.push({
          ...restOfTourData,
          slug: restOfTourData.slug || generateSlug(restOfTourData.title),
          destination: destId,
          categories: categoryIds,
          image: restOfTourData.image || '/placeholder.jpg',
          images: restOfTourData.images || [],
        });
      }

      if (toursToInsert.length > 0) {
        const created = await Tour.insertMany(toursToInsert, { ordered: false });
        report.toursCreated = created.length;
      }
    }

    return NextResponse.json({ success: true, report });

  } catch (error: any) {
    console.error('Seeding error:', error);
    // Check for specific duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: `Duplicate data error. If not wiping data, some items in your JSON might already exist. Details: ${error.message}` }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}