// Sync to NEW Algolia account
import { algoliasearch } from 'algoliasearch';
import dbConnect from '../lib/dbConnect';
import Tour from '../lib/models/Tour';

const ALGOLIA_APP_ID = 'WMDNV9WSOI';
const ALGOLIA_ADMIN_KEY = '8c956f79a2cffa2ec8715a9ec2a5d7a3';
const INDEX_NAME = 'foxes_technology';

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

// Helper function to format tour data for Algolia
const formatTourForAlgolia = (tour: any) => {
  return {
    objectID: tour._id.toString(),
    title: tour.title || '',
    slug: tour.slug || '',
    description: tour.description || '',
    location: tour.location || '',
    price: tour.price || 0,
    discountPrice: tour.discountPrice || tour.price || 0,
    rating: tour.rating || 0,
    reviewCount: tour.reviewCount || 0,
    duration: tour.duration || 0,
    image: tour.image || '',
    images: tour.images || [],
    tags: tour.tags || [],
    category: tour.category ? {
      _id: tour.category._id?.toString() || tour.category.toString(),
      name: tour.category.name || ''
    } : null,
    destination: tour.destination ? {
      _id: tour.destination._id?.toString() || tour.destination.toString(),
      name: tour.destination.name || ''
    } : null,
    isPublished: tour.isPublished || false,
    isFeatured: tour.isFeatured || false,
    bookings: tour.bookings || 0,
    highlights: tour.highlights || [],
    included: tour.included || [],
    excluded: tour.excluded || [],
    _tags: [
      ...(tour.tags || []),
      tour.category?.name || '',
      tour.destination?.name || '',
      tour.location || ''
    ].filter(Boolean)
  };
};

async function syncToNewAlgolia() {
  try {
    console.log('🚀 Starting sync to NEW Algolia account...');
    console.log('App ID:', ALGOLIA_APP_ID);
    console.log('Index:', INDEX_NAME);

    // Connect to database
    await dbConnect();
    console.log('✅ Connected to MongoDB');

    // Configure index settings
    console.log('\n⚙️  Configuring index settings...');
    await client.setSettings({
      indexName: INDEX_NAME,
      indexSettings: {
        searchableAttributes: [
          'title',
          'description',
          'location',
          '_tags',
          'tags',
          'category.name',
          'destination.name'
        ],
        attributesForFaceting: [
          'searchable(category.name)',
          'searchable(destination.name)',
          'filterOnly(price)',
          'filterOnly(rating)',
          'filterOnly(duration)'
        ],
        customRanking: [
          'desc(isFeatured)',
          'desc(rating)',
          'desc(bookings)'
        ],
        hitsPerPage: 20
      }
    });
    console.log('✅ Index configured');

    // Fetch and sync tours
    console.log('\n📦 Fetching tours from MongoDB...');
    const tours = await Tour.find({ isPublished: true })
      .populate('category', 'name')
      .populate('destination', 'name')
      .lean();

    console.log(`Found ${tours.length} published tours`);

    if (tours.length === 0) {
      console.log('⚠️  No tours to sync');
      return;
    }

    // Sync in batches
    const batchSize = 100;
    for (let i = 0; i < tours.length; i += batchSize) {
      const batch = tours.slice(i, i + batchSize);
      const formattedTours = batch.map(formatTourForAlgolia);

      console.log(`Syncing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tours.length / batchSize)}...`);
      await client.saveObjects({
        indexName: INDEX_NAME,
        objects: formattedTours
      });
    }

    console.log('\n✅ Sync completed successfully!');
    console.log(`📊 Total synced: ${tours.length} tours`);

    // Verify
    const { items: indices } = await client.listIndices();
    const ourIndex = indices.find((idx: any) => idx.name === INDEX_NAME);
    if (ourIndex) {
      console.log(`✅ Index "${INDEX_NAME}" now has ${ourIndex.entries} entries`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncToNewAlgolia();
