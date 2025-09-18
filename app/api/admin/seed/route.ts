// app/api/admin/seed/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';

// Utility function to generate URL-friendly slugs
const generateSlug = (name: string): string => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Interface definitions for type safety
interface SeedDestination {
  name: string;
  slug?: string;
  image: string;
  description: string;
}

interface SeedCategory {
  name: string;
  slug?: string;
}

interface SeedTour {
  title: string;
  slug?: string;
  description: string;
  longDescription?: string;
  price: number;
  discountPrice?: number;
  duration: string;
  maxGroupSize: number;
  destinationName: string;
  categoryNames: string[];
  featured?: boolean;
  isFeatured?: boolean;
  image: string;
  images?: string[];
  highlights?: string[];
  includes?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  itinerary?: Array<{
    day: number;
    title: string;
    description: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  bookingOptions?: Array<{
    type: string;
    label: string;
    price: number;
  }>;
  addOns?: Array<{
    name: string;
    description: string;
    price: number;
  }>;
  difficulty?: string;
  isPublished?: boolean;
  tags?: string[];
}

interface SeedData {
  destinations?: SeedDestination[];
  categories?: SeedCategory[];
  tours?: SeedTour[];
  wipeData?: boolean;
}

interface ImportReport {
  wipedData: boolean;
  destinationsCreated: number;
  categoriesCreated: number;
  toursCreated: number;
  errors: string[];
  warnings: string[];
}

export async function POST(request: Request) {
  console.log('Starting data import process...');
  await dbConnect();
  
  try {
    const seedData: SeedData = await request.json();
    const { destinations, categories, tours, wipeData } = seedData;

    console.log('Received data:', {
      destinations: destinations?.length || 0,
      categories: categories?.length || 0,
      tours: tours?.length || 0,
      wipeData
    });

    const report: ImportReport = {
      wipedData: false,
      destinationsCreated: 0,
      categoriesCreated: 0,
      toursCreated: 0,
      errors: [],
      warnings: [],
    };

    // Step 1: Conditionally wipe existing data
    if (wipeData) {
      console.log('Wiping existing data...');
      try {
        await Promise.all([
          Tour.deleteMany({}),
          Category.deleteMany({}),
          Destination.deleteMany({}),
        ]);
        report.wipedData = true;
        console.log('Successfully wiped existing data');
      } catch (wipeError: any) {
        console.error('Error wiping data:', wipeError);
        report.errors.push(`Error wiping existing data: ${wipeError.message}`);
      }
    }

    // Step 2: Create destinations
    if (destinations && destinations.length > 0) {
      console.log(`Creating ${destinations.length} destinations...`);
      try {
        const destinationDocs = destinations.map((dest) => ({
          name: dest.name?.trim(),
          slug: dest.slug?.trim() || generateSlug(dest.name),
          image: dest.image || '/placeholder-destination.jpg',
          description: dest.description?.trim() || '',
        }));

        // Validate destinations
        const validDestinations = destinationDocs.filter((dest) => {
          if (!dest.name) {
            report.warnings.push('Skipped destination with missing name');
            return false;
          }
          return true;
        });

        if (validDestinations.length > 0) {
          const created = await Destination.insertMany(validDestinations, { ordered: false });
          report.destinationsCreated = created.length;
          console.log(`Successfully created ${created.length} destinations`);
        }
      } catch (destError: any) {
        console.error('Error creating destinations:', destError);
        if (destError.code === 11000) {
          report.errors.push('Some destinations already exist (duplicate names/slugs)');
        } else {
          report.errors.push(`Error creating destinations: ${destError.message}`);
        }
      }
    }

    // Step 3: Create categories
    if (categories && categories.length > 0) {
      console.log(`Creating ${categories.length} categories...`);
      try {
        const categoryDocs = categories.map((cat) => ({
          name: cat.name?.trim(),
          slug: cat.slug?.trim() || generateSlug(cat.name),
        }));

        // Validate categories
        const validCategories = categoryDocs.filter((cat) => {
          if (!cat.name) {
            report.warnings.push('Skipped category with missing name');
            return false;
          }
          return true;
        });

        if (validCategories.length > 0) {
          const created = await Category.insertMany(validCategories, { ordered: false });
          report.categoriesCreated = created.length;
          console.log(`Successfully created ${created.length} categories`);
        }
      } catch (catError: any) {
        console.error('Error creating categories:', catError);
        if (catError.code === 11000) {
          report.errors.push('Some categories already exist (duplicate names/slugs)');
        } else {
          report.errors.push(`Error creating categories: ${catError.message}`);
        }
      }
    }

    // Step 4: Create tours with proper linking
    if (tours && tours.length > 0) {
      console.log(`Processing ${tours.length} tours...`);
      
      try {
        // Fetch all destinations and categories for reference mapping
        const [allDestinations, allCategories] = await Promise.all([
          Destination.find({}),
          Category.find({}),
        ]);

        console.log(`Found ${allDestinations.length} destinations and ${allCategories.length} categories for reference`);

        // Create lookup maps
        const destinationMap = new Map(
          allDestinations.map((dest) => [dest.name.toLowerCase().trim(), dest._id])
        );
        const categoryMap = new Map(
          allCategories.map((cat) => [cat.name.toLowerCase().trim(), cat._id])
        );

        const toursToInsert = [];

        for (const tourData of tours) {
          const { destinationName, categoryNames, featured, isFeatured, ...restOfTourData } = tourData;

          // Validate required fields
          if (!tourData.title?.trim()) {
            report.errors.push('Skipped tour with missing title');
            continue;
          }

          if (!tourData.duration?.trim()) {
            report.errors.push(`Tour "${tourData.title}": Missing duration`);
            continue;
          }

          if (tourData.discountPrice === undefined && tourData.price === undefined) {
            report.errors.push(`Tour "${tourData.title}": Missing price information`);
            continue;
          }

          // Find destination
          const destinationId = destinationMap.get(destinationName?.toLowerCase().trim());
          if (!destinationId) {
            report.errors.push(`Tour "${tourData.title}": Destination "${destinationName}" not found`);
            continue;
          }

          // Find categories
          if (!categoryNames || categoryNames.length === 0) {
            report.errors.push(`Tour "${tourData.title}": No categories specified`);
            continue;
          }

          const categoryIds = categoryNames
            .map((name: string) => categoryMap.get(name.toLowerCase().trim()))
            .filter(Boolean);

          if (categoryIds.length === 0) {
            report.errors.push(`Tour "${tourData.title}": None of the specified categories were found: ${categoryNames.join(', ')}`);
            continue;
          }

          if (categoryIds.length !== categoryNames.length) {
            const foundCategories = categoryNames.filter((name: string) => 
              categoryMap.has(name.toLowerCase().trim())
            );
            report.warnings.push(
              `Tour "${tourData.title}": Only found categories: ${foundCategories.join(', ')}. Missing: ${categoryNames.filter(name => !categoryMap.has(name.toLowerCase().trim())).join(', ')}`
            );
          }

          // Prepare tour document
          const tourDoc = {
            // Basic info
            title: restOfTourData.title.trim(),
            slug: restOfTourData.slug?.trim() || generateSlug(restOfTourData.title),
            description: restOfTourData.description?.trim() || '',
            longDescription: restOfTourData.longDescription?.trim() || restOfTourData.description?.trim() || '',
            
            // Pricing
            price: restOfTourData.discountPrice || restOfTourData.price || 0,
            discountPrice: restOfTourData.discountPrice || restOfTourData.price || 0,
            originalPrice: restOfTourData.price && restOfTourData.discountPrice ? restOfTourData.price : undefined,
            
            // Duration and capacity
            duration: restOfTourData.duration.trim(),
            maxGroupSize: restOfTourData.maxGroupSize || 10,
            difficulty: restOfTourData.difficulty || 'Easy',
            
            // Relations
            destination: destinationId,
            category: categoryIds[0], // Use first category (schema expects singular)
            
            // Media
            image: restOfTourData.image || '/placeholder-tour.jpg',
            images: Array.isArray(restOfTourData.images) ? restOfTourData.images : [],
            
            // Lists
            highlights: Array.isArray(restOfTourData.highlights) ? restOfTourData.highlights.filter(Boolean) : [],
            includes: Array.isArray(restOfTourData.includes) ? restOfTourData.includes.filter(Boolean) : [],
            whatsIncluded: Array.isArray(restOfTourData.whatsIncluded) ? restOfTourData.whatsIncluded.filter(Boolean) : [],
            whatsNotIncluded: Array.isArray(restOfTourData.whatsNotIncluded) ? restOfTourData.whatsNotIncluded.filter(Boolean) : [],
            
            // Complex objects
            itinerary: Array.isArray(restOfTourData.itinerary) ? restOfTourData.itinerary : [],
            faq: Array.isArray(restOfTourData.faqs) ? restOfTourData.faqs : [],
            bookingOptions: Array.isArray(restOfTourData.bookingOptions) ? restOfTourData.bookingOptions : [],
            addOns: Array.isArray(restOfTourData.addOns) ? restOfTourData.addOns : [],
            
            // Status and tags
            isFeatured: featured || isFeatured || false,
            isPublished: restOfTourData.isPublished !== false, // Default to true unless explicitly false
            tags: Array.isArray(restOfTourData.tags) ? restOfTourData.tags : [],
            
            // Availability with proper structure
            availability: {
              type: 'daily',
              availableDays: [0, 1, 2, 3, 4, 5, 6],
              slots: [{ time: '10:00', capacity: restOfTourData.maxGroupSize || 10 }],
              blockedDates: [],
            },
          };

          toursToInsert.push(tourDoc);
        }

        // Insert valid tours
        if (toursToInsert.length > 0) {
          console.log(`Inserting ${toursToInsert.length} valid tours...`);
          const created = await Tour.insertMany(toursToInsert, { ordered: false });
          report.toursCreated = created.length;
          console.log(`Successfully created ${created.length} tours`);
        } else {
          console.log('No valid tours to insert');
        }

      } catch (tourError: any) {
        console.error('Error processing tours:', tourError);
        if (tourError.code === 11000) {
          report.errors.push('Some tours already exist (duplicate titles/slugs)');
        } else {
          report.errors.push(`Error creating tours: ${tourError.message}`);
        }
      }
    }

    // Summary logging
    console.log('Import completed:', {
      destinationsCreated: report.destinationsCreated,
      categoriesCreated: report.categoriesCreated,
      toursCreated: report.toursCreated,
      errors: report.errors.length,
      warnings: report.warnings.length,
    });

    return NextResponse.json({
      success: true,
      report,
      message: `Successfully imported ${report.destinationsCreated + report.categoriesCreated + report.toursCreated} items`,
    });

  } catch (error: any) {
    console.error('Fatal seeding error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown field';
      return NextResponse.json({
        success: false,
        error: `Duplicate ${duplicateField} detected. Consider using "wipeData: true" to clear existing data first.`,
        details: error.message,
      }, { status: 409 });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {})
        .map((err: any) => err.message)
        .join(', ');
      return NextResponse.json({
        success: false,
        error: `Data validation failed: ${validationErrors}`,
      }, { status: 400 });
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON format in request body',
      }, { status: 400 });
    }

    // Generic server error
    return NextResponse.json({
      success: false,
      error: 'An unexpected server error occurred during import',
      details: error.message,
    }, { status: 500 });
  }
}