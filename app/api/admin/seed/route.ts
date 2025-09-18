// app/api/admin/seed/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';

// Utility function to generate URL-friendly slugs
const generateSlug = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Interface definitions for better type safety
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
  updateMode?: 'insert' | 'upsert' | 'replace';
}

interface ImportReport {
  wipedData: boolean;
  destinationsCreated: number;
  categoriesCreated: number;
  toursCreated: number;
  destinationsUpdated: number;
  categoriesUpdated: number;
  toursUpdated: number;
  errors: string[];
  warnings: string[];
}

export async function POST(request: Request) {
  console.log('Starting data import process...');
  await dbConnect();
  
  try {
    const seedData: SeedData = await request.json();
    const { destinations, categories, tours, wipeData, updateMode = 'insert' } = seedData;

    console.log('Received data:', {
      destinations: destinations?.length || 0,
      categories: categories?.length || 0,
      tours: tours?.length || 0,
      wipeData,
      updateMode
    });

    const report: ImportReport = {
      wipedData: false,
      destinationsCreated: 0,
      categoriesCreated: 0,
      toursCreated: 0,
      destinationsUpdated: 0,
      categoriesUpdated: 0,
      toursUpdated: 0,
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

    // Step 2: Process destinations with upsert logic
    if (destinations && destinations.length > 0) {
      console.log(`Processing ${destinations.length} destinations with ${updateMode} mode...`);
      
      let destinationsCreated = 0;
      let destinationsUpdated = 0;

      for (const destData of destinations) {
        try {
          if (!destData.name?.trim()) {
            report.warnings.push('Skipped destination with missing name');
            continue;
          }

          const destinationDoc = {
            name: destData.name.trim(),
            slug: destData.slug?.trim() || generateSlug(destData.name),
            image: destData.image || '/placeholder-destination.jpg',
            description: destData.description?.trim() || '',
            updatedAt: new Date(),
          };

          const existingDestination = await Destination.findOne({
            $or: [
              { slug: destinationDoc.slug },
              { name: destinationDoc.name }
            ]
          });

          if (existingDestination && (updateMode === 'upsert' || updateMode === 'replace')) {
            // Update existing destination
            await Destination.findByIdAndUpdate(
              existingDestination._id,
              { $set: destinationDoc },
              { runValidators: true }
            );
            destinationsUpdated++;
            console.log(`Updated destination: ${destinationDoc.name}`);
          } else if (!existingDestination || updateMode === 'insert') {
            // Create new destination
            await Destination.create({
              ...destinationDoc,
              createdAt: new Date()
            });
            destinationsCreated++;
            console.log(`Created destination: ${destinationDoc.name}`);
          } else {
            report.warnings.push(`Destination "${destData.name}" already exists (skipped)`);
          }
        } catch (destError: any) {
          console.error(`Error processing destination "${destData.name}":`, destError);
          if (destError.code === 11000) {
            report.warnings.push(`Destination "${destData.name}" already exists (duplicate)`);
          } else {
            report.errors.push(`Error processing destination "${destData.name}": ${destError.message}`);
          }
        }
      }

      report.destinationsCreated = destinationsCreated;
      report.destinationsUpdated = destinationsUpdated;
      console.log(`Destinations processed: ${destinationsCreated} created, ${destinationsUpdated} updated`);
    }

    // Step 3: Process categories with upsert logic
    if (categories && categories.length > 0) {
      console.log(`Processing ${categories.length} categories with ${updateMode} mode...`);
      
      let categoriesCreated = 0;
      let categoriesUpdated = 0;

      for (const catData of categories) {
        try {
          if (!catData.name?.trim()) {
            report.warnings.push('Skipped category with missing name');
            continue;
          }

          const categoryDoc = {
            name: catData.name.trim(),
            slug: catData.slug?.trim() || generateSlug(catData.name),
            updatedAt: new Date(),
          };

          const existingCategory = await Category.findOne({
            $or: [
              { slug: categoryDoc.slug },
              { name: categoryDoc.name }
            ]
          });

          if (existingCategory && (updateMode === 'upsert' || updateMode === 'replace')) {
            // Update existing category
            await Category.findByIdAndUpdate(
              existingCategory._id,
              { $set: categoryDoc },
              { runValidators: true }
            );
            categoriesUpdated++;
            console.log(`Updated category: ${categoryDoc.name}`);
          } else if (!existingCategory || updateMode === 'insert') {
            // Create new category
            await Category.create({
              ...categoryDoc,
              createdAt: new Date()
            });
            categoriesCreated++;
            console.log(`Created category: ${categoryDoc.name}`);
          } else {
            report.warnings.push(`Category "${catData.name}" already exists (skipped)`);
          }
        } catch (catError: any) {
          console.error(`Error processing category "${catData.name}":`, catError);
          if (catError.code === 11000) {
            report.warnings.push(`Category "${catData.name}" already exists (duplicate)`);
          } else {
            report.errors.push(`Error processing category "${catData.name}": ${catError.message}`);
          }
        }
      }

      report.categoriesCreated = categoriesCreated;
      report.categoriesUpdated = categoriesUpdated;
      console.log(`Categories processed: ${categoriesCreated} created, ${categoriesUpdated} updated`);
    }

    // Step 4: Process tours with upsert logic
    if (tours && tours.length > 0) {
      console.log(`Processing ${tours.length} tours with ${updateMode} mode...`);
      
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

        let toursCreated = 0;
        let toursUpdated = 0;

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
            
            // Timestamp
            updatedAt: new Date(),
          };

          try {
            // UPSERT LOGIC: Update if exists, create if new
            const existingTour = await Tour.findOne({ 
              $or: [
                { slug: tourDoc.slug },
                { title: tourDoc.title }
              ]
            });

            if (existingTour && (updateMode === 'upsert' || updateMode === 'replace')) {
              // UPDATE existing tour
              const updatedTour = await Tour.findByIdAndUpdate(
                existingTour._id,
                { $set: tourDoc },
                { 
                  new: true, 
                  runValidators: true,
                  populate: [
                    { path: 'category', select: 'name slug' },
                    { path: 'destination', select: 'name slug' }
                  ]
                }
              );
              
              if (updatedTour) {
                toursUpdated++;
                console.log(`Updated tour: ${updatedTour.title}`);
              }
              
            } else if (!existingTour || updateMode === 'insert') {
              // CREATE new tour
              const newTour = await Tour.create({
                ...tourDoc,
                createdAt: new Date()
              });
              
              if (newTour) {
                toursCreated++;
                console.log(`Created tour: ${newTour.title}`);
              }
            } else {
              // Skip if exists and mode is insert-only
              report.warnings.push(`Tour "${tourData.title}" already exists (skipped due to insert-only mode)`);
            }

          } catch (tourError: any) {
            console.error(`Error processing tour "${tourData.title}":`, tourError);
            if (tourError.code === 11000) {
              report.warnings.push(`Tour "${tourData.title}" already exists (duplicate)`);
            } else {
              report.errors.push(`Error processing tour "${tourData.title}": ${tourError.message}`);
            }
          }
        }

        report.toursCreated = toursCreated;
        report.toursUpdated = toursUpdated;
        console.log(`Tours processed: ${toursCreated} created, ${toursUpdated} updated`);

      } catch (tourError: any) {
        console.error('Error in tour processing:', tourError);
        report.errors.push(`Error in tour processing: ${tourError.message}`);
      }
    }

    // Summary logging
    console.log('Import completed:', {
      destinationsCreated: report.destinationsCreated,
      destinationsUpdated: report.destinationsUpdated,
      categoriesCreated: report.categoriesCreated,
      categoriesUpdated: report.categoriesUpdated,
      toursCreated: report.toursCreated,
      toursUpdated: report.toursUpdated,
      errors: report.errors.length,
      warnings: report.warnings.length,
    });

    // Determine success based on whether any items were processed
    const totalProcessed = report.destinationsCreated + report.destinationsUpdated + 
                          report.categoriesCreated + report.categoriesUpdated + 
                          report.toursCreated + report.toursUpdated;

    return NextResponse.json({
      success: true,
      report,
      message: `Successfully processed ${totalProcessed} items (${report.destinationsCreated + report.categoriesCreated + report.toursCreated} created, ${report.destinationsUpdated + report.categoriesUpdated + report.toursUpdated} updated)`,
    });

  } catch (error: any) {
    console.error('Fatal seeding error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown field';
      return NextResponse.json({
        success: false,
        error: `Duplicate ${duplicateField} detected. Consider using "updateMode: upsert" to update existing items.`,
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