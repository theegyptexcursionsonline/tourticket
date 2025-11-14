// scripts/test-interests-api.ts
// Test what the interests API returns

import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';

async function testInterestsAPI() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Simulate the API logic from /api/interests/route.ts
    const categories = await Category.find({}).lean();
    console.log(`Found ${categories.length} categories\n`);

    // For each category, count tours (exactly as API does)
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        try {
          const tourCount = await Tour.countDocuments({
            category: { $in: [category._id] },
            isPublished: true
          });

          return {
            type: 'category' as const,
            name: category.name,
            slug: category.slug,
            products: tourCount,
            _id: category._id,
            image: category.heroImage,
            featured: category.featured
          };
        } catch (error) {
          console.error(`Error counting tours for category ${category.name}:`, error);
          return {
            type: 'category' as const,
            name: category.name,
            slug: category.slug,
            products: 0,
            _id: category._id,
            image: category.heroImage,
            featured: category.featured
          };
        }
      })
    );

    // Filter featured only
    const featuredCategories = categoriesWithCounts.filter(cat => cat.featured === true);

    console.log('=== FEATURED CATEGORIES (as shown on homepage) ===\n');
    featuredCategories.forEach(cat => {
      console.log(`${cat.name}: ${cat.products} tours`);
    });

    console.log('\n=== ALL CATEGORIES WITH TOURS > 0 ===\n');
    const categoriesWithTours = categoriesWithCounts.filter(cat => cat.products > 0);
    categoriesWithTours.forEach(cat => {
      const featured = cat.featured ? '⭐' : '  ';
      console.log(`${featured} ${cat.name}: ${cat.products} tours`);
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total categories: ${categories.length}`);
    console.log(`Featured categories: ${featuredCategories.length}`);
    console.log(`Categories with tours: ${categoriesWithTours.length}`);
    console.log(`Featured categories with tours: ${featuredCategories.filter(c => c.products > 0).length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testInterestsAPI();
