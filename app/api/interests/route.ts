import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';

export async function GET() {
  await dbConnect();

  try {
    console.log('Fetching interests with categories and attraction pages...');
    
    // Fetch all categories from the database
    const categories = await Category.find({}).lean();
    console.log('Categories found:', categories.length);

    // Fetch all published attraction pages
    const attractionPages = await AttractionPage.find({ 
      isPublished: true,
      pageType: 'attraction' 
    }).lean();
    console.log('Attraction pages found:', attractionPages.length);

    // For each category, count the number of tours associated with it
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const tourCount = await Tour.countDocuments({ 
          category: category._id,
          isPublished: true 
        });
        console.log(`Category ${category.name}: ${tourCount} tours`);
        return {
          type: 'category',
          name: category.name,
          slug: category.slug,
          products: tourCount,
          _id: category._id
        };
      })
    );

    // For each attraction page, count matching tours
    const attractionsWithCounts = await Promise.all(
      attractionPages.map(async (page) => {
        let tourCount = 0;
        
        // Count tours that match this attraction
        const searchTerms = [
          page.title,
          ...(page.keywords || []),
          ...(page.highlights || [])
        ].filter(Boolean);

        if (searchTerms.length > 0) {
          const searchQueries = [];
          searchQueries.push({ title: { $regex: new RegExp(page.title, 'i') } });
          searchQueries.push({ description: { $regex: new RegExp(page.title, 'i') } });
          
          if (page.keywords && page.keywords.length > 0) {
            searchQueries.push({ tags: { $in: page.keywords } });
            searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(page.keywords.join('|'), 'i') } } });
          }
          
          if (page.highlights && page.highlights.length > 0) {
            searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(page.highlights.join('|'), 'i') } } });
          }

          tourCount = await Tour.countDocuments({
            $and: [
              { isPublished: true },
              { $or: searchQueries }
            ]
          });
        }

        console.log(`Attraction ${page.title}: ${tourCount} tours`);
        return {
          type: 'attraction',
          name: page.title,
          slug: page.slug,
          products: tourCount,
          _id: page._id,
          featured: page.featured
        };
      })
    );

    // Combine categories and attractions
    const allInterests = [...categoriesWithCounts, ...attractionsWithCounts];

    // Sort by featured first, then by product count, then by name
    allInterests.sort((a, b) => {
      // Featured items first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      
      // Then by product count (descending)
      if (b.products !== a.products) {
        return b.products - a.products;
      }
      
      // Finally by name (ascending)
      return a.name.localeCompare(b.name);
    });

    console.log('Final interests:', allInterests.length);
    return NextResponse.json({ success: true, data: allInterests });
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch interests." },
      { status: 500 }
    );
  }
}