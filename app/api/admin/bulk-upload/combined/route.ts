import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';

const findByName = async (Model: any, name: string) => {
    return Model.findOne({ name: new RegExp(`^${name}$`, 'i') }).lean();
};

export async function POST(req: Request) {
    await dbConnect();

    try {
        const body = await req.json();
        const { destinations = [], categories = [], attractions = [], tours = [] } = body;

        const results = {
            destinations: { created: 0, updated: 0, errors: [] as string[] },
            categories: { created: 0, updated: 0, errors: [] as string[] },
            attractions: { created: 0, updated: 0, errors: [] as string[] },
            tours: { created: 0, updated: 0, errors: [] as string[] },
            missingImages: [] as any[]
        };

        // STEP 1: Process Destinations
        if (destinations.length > 0) {
            for (const item of destinations) {
                try {
                    const existing = await Destination.findOne({ slug: item.slug });
                    await Destination.updateOne({ slug: item.slug }, item, { upsert: true, runValidators: true });
                    
                    if (existing) {
                        results.destinations.updated++;
                    } else {
                        results.destinations.created++;
                        // Check if image is missing
                        const newDoc = await Destination.findOne({ slug: item.slug }).lean();
                        if (newDoc && !newDoc.image) {
                            results.missingImages.push({
                                _id: newDoc._id.toString(),
                                name: newDoc.name,
                                imageField: 'image',
                                modelType: 'Destinations'
                            });
                        }
                    }
                } catch (e: any) {
                    results.destinations.errors.push(`Destination "${item.name}": ${e.message}`);
                }
            }
        }

        // STEP 2: Process Categories
        if (categories.length > 0) {
            for (const item of categories) {
                try {
                    const existing = await Category.findOne({ slug: item.slug });
                    await Category.updateOne({ slug: item.slug }, item, { upsert: true, runValidators: true });
                    existing ? results.categories.updated++ : results.categories.created++;
                } catch (e: any) {
                    results.categories.errors.push(`Category "${item.name}": ${e.message}`);
                }
            }
        }
        
        // STEP 3: Process Attraction Pages
        if (attractions.length > 0) {
            for (const item of attractions) {
                try {
                    let doc = { ...item };
                    if (item.pageType === 'category' && item.categoryName) {
                        const categoryDoc = await findByName(Category, item.categoryName);
                        if (!categoryDoc) {
                           results.attractions.errors.push(`Category "${item.categoryName}" not found for Attraction Page "${item.title}".`);
                           continue;
                        }
                        doc.categoryId = categoryDoc._id;
                        delete doc.categoryName;
                    }
                    
                    const existing = await AttractionPage.findOne({ slug: item.slug });
                    await AttractionPage.updateOne({ slug: item.slug }, doc, { upsert: true, runValidators: true });
                    
                    if (existing) {
                        results.attractions.updated++;
                    } else {
                        results.attractions.created++;
                        const newDoc = await AttractionPage.findOne({ slug: item.slug }).lean();
                        if (newDoc && !newDoc.heroImage) {
                            results.missingImages.push({
                                _id: newDoc._id.toString(),
                                name: newDoc.title,
                                imageField: 'heroImage',
                                modelType: 'Attractions'
                            });
                        }
                    }
                } catch (e: any) {
                    results.attractions.errors.push(`Attraction Page "${item.title}": ${e.message}`);
                }
            }
        }

        // STEP 4: Process Tours
        if (tours.length > 0) {
            for (const item of tours) {
                try {
                    if (!item.slug || !item.destinationName || !item.categoryName) {
                        results.tours.errors.push(`Skipping tour: Missing slug, destinationName, or categoryName for "${item.title || 'Untitled'}"`);
                        continue;
                    }

                    const destinationDoc = await findByName(Destination, item.destinationName);
                    const categoryDoc = await findByName(Category, item.categoryName);

                    if (!destinationDoc) {
                        results.tours.errors.push(`Destination "${item.destinationName}" not found for tour "${item.title}".`);
                        continue;
                    }
                    if (!categoryDoc) {
                        results.tours.errors.push(`Category "${item.categoryName}" not found for tour "${item.title}".`);
                        continue;
                    }

                    const doc = { ...item, destination: destinationDoc._id, category: categoryDoc._id };
                    delete doc.destinationName;
                    delete doc.categoryName;
                    
                    const existing = await Tour.findOne({ slug: item.slug });
                    await Tour.updateOne({ slug: item.slug }, doc, { upsert: true, runValidators: true });
                    
                    if (existing) {
                        results.tours.updated++;
                    } else {
                        results.tours.created++;
                        const newDoc = await Tour.findOne({ slug: item.slug }).lean();
                        if (newDoc && !newDoc.image) {
                            results.missingImages.push({
                                _id: newDoc._id.toString(),
                                name: newDoc.title,
                                imageField: 'image',
                                modelType: 'Tours'
                            });
                        }
                    }
                } catch (e: any) {
                    results.tours.errors.push(`Tour "${item.title}": ${e.message}`);
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        return NextResponse.json({ 
            success: false, 
            error: 'An unexpected error occurred.', 
            details: error.message 
        }, { status: 500 });
    }
}