// app/api/interests/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';

export async function GET() {
  try {
    await dbConnect();

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
        try {
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
        } catch (error) {
          console.error(`Error counting tours for category ${category.name}:`, error);
          return {
            type: 'category',
            name: category.name,
            slug: category.slug,
            products: 0,
            _id: category._id
          };
        }
      })
    );

    // For each attraction page, count matching tours with simplified logic
    const attractionsWithCounts = await Promise.all(
      attractionPages.map(async (page) => {
        try {
          let tourCount = 0;
          
          // Build a simpler search query
          const searchQueries = [];
          
          // Search by title (most important)
          if (page.title) {
            searchQueries.push({ 
              title: { $regex: page.title, $options: 'i' } 
            });
          }
          
          // Search by keywords if they exist
          if (page.keywords && Array.isArray(page.keywords) && page.keywords.length > 0) {
            // Filter out empty keywords
            const validKeywords = page.keywords.filter(k => k && k.trim().length > 0);
            
            if (validKeywords.length > 0) {
              // Search in tags array
              searchQueries.push({ 
                tags: { 
                  $in: validKeywords.map(k => new RegExp(k, 'i')) 
                } 
              });
              
              // Search in title with keywords
              validKeywords.forEach(keyword => {
                searchQueries.push({ 
                  title: { $regex: keyword, $options: 'i' } 
                });
              });
            }
          }
          
          // Only search if we have valid queries
          if (searchQueries.length > 0) {
            tourCount = await Tour.countDocuments({
              isPublished: true,
              $or: searchQueries
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
        } catch (error) {
          console.error(`Error counting tours for attraction ${page.title}:`, error);
          return {
            type: 'attraction',
            name: page.title,
            slug: page.slug,
            products: 0,
            _id: page._id,
            featured: page.featured
          };
        }
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
      { 
        success: false, 
        error: "Failed to fetch interests.",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}