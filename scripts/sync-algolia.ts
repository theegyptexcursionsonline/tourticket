// scripts/sync-algolia.ts
// Script to sync all tours from MongoDB to Algolia
import dbConnect from '../lib/dbConnect';
import Tour from '../lib/models/Tour';
import { syncToursToAlgolia, configureAlgoliaIndex, clearAlgoliaIndex } from '../lib/algolia';

async function syncAllToursToAlgolia() {
  try {
    console.log('Starting Algolia sync...');

    // Connect to database
    await dbConnect();
    console.log('Connected to MongoDB');

    // Configure Algolia index settings
    console.log('Configuring Algolia index...');
    await configureAlgoliaIndex();

    // Fetch all published tours with populated fields
    console.log('Fetching tours from MongoDB...');
    const tours = await Tour.find({ isPublished: true })
      .populate('category', 'name')
      .populate('destination', 'name')
      .lean();

    console.log(`Found ${tours.length} published tours`);

    if (tours.length === 0) {
      console.log('No tours to sync');
      return;
    }

    // Sync tours to Algolia in batches
    const batchSize = 100;
    for (let i = 0; i < tours.length; i += batchSize) {
      const batch = tours.slice(i, i + batchSize);
      console.log(`Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tours.length / batchSize)}...`);
      await syncToursToAlgolia(batch);
    }

    console.log('✅ Algolia sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing to Algolia:', error);
    process.exit(1);
  }
}

// Clear and resync (optional - use with caution)
async function clearAndResync() {
  try {
    console.log('⚠️  Clearing Algolia index...');
    await clearAlgoliaIndex();
    console.log('Index cleared');

    await syncAllToursToAlgolia();
  } catch (error) {
    console.error('❌ Error in clear and resync:', error);
    process.exit(1);
  }
}

// Run the sync
const args = process.argv.slice(2);
if (args.includes('--clear')) {
  clearAndResync();
} else {
  syncAllToursToAlgolia();
}
