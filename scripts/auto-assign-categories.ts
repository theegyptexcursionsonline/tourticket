// scripts/auto-assign-categories.ts
// Automatically assign categories to uncategorized tours based on title/keywords

import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import readline from 'readline';

// Category keyword mappings for intelligent matching
const categoryKeywords: Record<string, string[]> = {
  'cultural': ['cultural', 'culture', 'heritage', 'traditional', 'local', 'village', 'nubian', 'bedouin'],
  'adventure-tours': ['adventure', 'extreme', 'thrill', 'exciting'],
  'food-drink': ['food', 'drink', 'culinary', 'dining', 'restaurant', 'cuisine', 'lunch', 'dinner', 'breakfast'],
  'family': ['family', 'kids', 'children', 'family-friendly'],
  'desert': ['desert', 'sahara', 'sand', 'dunes', 'bedouin'],
  'day-trips': ['day trip', 'excursion', 'day tour', 'full day', 'half day'],
  'educational': ['educational', 'learning', 'guided', 'historical', 'archaeology'],
  'desert-safaris': ['safari', 'desert safari', '4x4', 'jeep'],
  'cruises-boat-tours': ['cruise', 'boat', 'sailing', 'yacht', 'ship', 'felucca', 'nile cruise', 'red sea'],
  'city-cultural-tours': ['city', 'cairo', 'alexandria', 'urban', 'downtown'],
  'water-sports': ['water sport', 'jet ski', 'diving', 'snorkeling', 'parasailing', 'kitesurfing', 'windsurfing'],
  'quad-atv-tours': ['quad', 'atv', 'quadbike', 'four wheeler'],
  'horseback-riding': ['horse', 'horseback', 'equestrian'],
  'spa-wellness': ['spa', 'wellness', 'massage', 'hammam', 'turkish bath', 'relaxation', 'therapy'],
  'snorkeling-diving': ['snorkel', 'dive', 'diving', 'underwater', 'reef', 'scuba'],
  'historical': ['historical', 'ancient', 'pharaoh', 'temple', 'tomb', 'pyramid', 'museum'],
  'pyramid-tours': ['pyramid', 'giza', 'sphinx', 'pyramids'],
  'luxor-tours': ['luxor', 'karnak', 'valley of kings', 'hatshepsut'],
  'cairo-tours': ['cairo', 'giza'],
  'buggy-dune-tours': ['buggy', 'dune buggy', 'sand buggy'],
  'camel-tours': ['camel', 'camel ride', 'camel riding'],
  'multi-day': ['multi-day', 'multiple days', 'overnight', '2 days', '3 days', '4 days', '5 days', 'package'],
  'luxury': ['luxury', 'premium', 'vip', 'exclusive', 'deluxe', '5-star', 'private'],
  'private': ['private', 'private tour', 'exclusive'],
  'museum-tours': ['museum', 'egyptian museum', 'antiquities'],
  'food-tours': ['food tour', 'street food', 'culinary tour'],
  'dinner-cruises': ['dinner cruise', 'dinner show', 'dining cruise'],
  'airport-transfers': ['airport transfer', 'pickup', 'drop-off', 'transportation'],
  'sunset': ['sunset', 'evening'],
  'sunrise': ['sunrise', 'dawn', 'morning'],
  'photography': ['photography', 'photo', 'photoshoot'],
  'shopping': ['shopping', 'bazaar', 'market', 'souk'],
  'nightlife': ['nightlife', 'night', 'evening', 'show', 'entertainment'],
  'romantic': ['romantic', 'honeymoon', 'couples'],
  'religious': ['religious', 'mosque', 'church', 'monastery', 'coptic', 'islamic'],
  'nature': ['nature', 'wildlife', 'natural', 'ecological'],
  'beach-activities': ['beach', 'coastal', 'seaside', 'shore'],
  'light-shows': ['light show', 'sound and light', 'son et lumiere'],
  'hot-air-balloon': ['balloon', 'hot air balloon', 'flight'],
};

interface CategoryMatch {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  score: number;
  matchedKeywords: string[];
}

function findMatchingCategories(tour: any, categories: any[]): CategoryMatch[] {
  const tourText = `${tour.title} ${tour.description || ''} ${tour.highlights?.join(' ') || ''} ${tour.tags?.join(' ') || ''}`.toLowerCase();

  const matches: CategoryMatch[] = [];

  for (const category of categories) {
    const keywords = categoryKeywords[category.slug] || [];
    const matchedKeywords: string[] = [];
    let score = 0;

    // Check each keyword
    for (const keyword of keywords) {
      if (tourText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        // Higher score for title matches
        if (tour.title.toLowerCase().includes(keyword.toLowerCase())) {
          score += 10;
        } else {
          score += 5;
        }
      }
    }

    // Also check for exact category name match
    if (tourText.includes(category.name.toLowerCase())) {
      matchedKeywords.push(category.name);
      score += 15;
    }

    if (score > 0) {
      matches.push({
        categoryId: category._id.toString(),
        categoryName: category.name,
        categorySlug: category.slug,
        score,
        matchedKeywords
      });
    }
  }

  // Sort by score (highest first) and return top 3
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

async function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function autoAssignCategories() {
  try {
    await dbConnect();
    console.log('✓ Connected to database\n');

    // Get all categories
    const categories = await Category.find({}).lean();
    console.log(`Found ${categories.length} categories\n`);

    // Get uncategorized tours
    const uncategorizedTours = await Tour.find({
      $or: [
        { category: { $exists: false } },
        { category: { $size: 0 } },
        { category: null }
      ]
    }).lean();

    console.log(`Found ${uncategorizedTours.length} uncategorized tours\n`);

    if (uncategorizedTours.length === 0) {
      console.log('✓ All tours already have categories assigned!');
      process.exit(0);
    }

    // Analyze and show preview
    console.log('=== PREVIEW: CATEGORY ASSIGNMENTS ===\n');

    const assignments: Array<{
      tourId: string;
      tourTitle: string;
      categories: CategoryMatch[];
    }> = [];

    for (const tour of uncategorizedTours.slice(0, 20)) { // Show first 20 as preview
      const matches = findMatchingCategories(tour, categories);

      if (matches.length > 0) {
        assignments.push({
          tourId: tour._id.toString(),
          tourTitle: tour.title,
          categories: matches
        });

        console.log(`📍 ${tour.title}`);
        console.log(`   Published: ${tour.isPublished ? '✓' : '✗'}`);
        console.log(`   Suggested categories (${matches.length}):`);
        matches.forEach((match, idx) => {
          console.log(`      ${idx + 1}. ${match.categoryName} (score: ${match.score}) - matched: ${match.matchedKeywords.join(', ')}`);
        });
        console.log('');
      }
    }

    if (uncategorizedTours.length > 20) {
      console.log(`... and ${uncategorizedTours.length - 20} more tours\n`);
    }

    // Ask for confirmation
    console.log('\n=== ASSIGNMENT STRATEGY ===');
    console.log('Each tour will be assigned to categories with score > 10');
    console.log('Tours may be assigned to multiple categories if relevant\n');

    const answer = await askQuestion('Do you want to proceed with auto-assignment? (yes/no): ');

    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Assignment cancelled.');
      process.exit(0);
    }

    // Proceed with assignment
    console.log('\n=== ASSIGNING CATEGORIES ===\n');

    let assignedCount = 0;
    let skippedCount = 0;

    for (const tour of uncategorizedTours) {
      const matches = findMatchingCategories(tour, categories);

      // Only assign categories with score > 10 (strong matches)
      const strongMatches = matches.filter(m => m.score >= 10);

      if (strongMatches.length > 0) {
        const categoryIds = strongMatches.map(m => m.categoryId);

        await Tour.findByIdAndUpdate(tour._id, {
          category: categoryIds
        });

        assignedCount++;
        console.log(`✓ ${tour.title}`);
        console.log(`   Assigned to: ${strongMatches.map(m => m.categoryName).join(', ')}`);
      } else {
        skippedCount++;
        console.log(`⊘ ${tour.title}`);
        console.log(`   Skipped (no strong category match)`);
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`✓ Assigned categories to ${assignedCount} tours`);
    console.log(`⊘ Skipped ${skippedCount} tours (no strong matches)`);
    console.log(`📊 Total processed: ${uncategorizedTours.length} tours\n`);

    // Final verification
    const stillUncategorized = await Tour.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: { $size: 0 } },
        { category: null }
      ]
    });

    console.log(`Remaining uncategorized tours: ${stillUncategorized}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

autoAssignCategories();
