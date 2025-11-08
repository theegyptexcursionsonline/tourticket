// lib/algolia.ts
import { algoliasearch } from 'algoliasearch';

// Initialize Algolia client
const getAlgoliaClient = () => {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY || process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;

  if (!appId || !apiKey) {
    console.warn('Algolia credentials not found. Search functionality will be limited.');
    return null;
  }

  return algoliasearch(appId, apiKey);
};

export const algoliaClient = getAlgoliaClient();

// Index names
export const ALGOLIA_INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'tours';

// Get the tours index
export const getToursIndex = () => {
  if (!algoliaClient) return null;
  return algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
};

// Helper function to format tour data for Algolia
export const formatTourForAlgolia = (tour: any) => {
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

// Sync a single tour to Algolia
export const syncTourToAlgolia = async (tour: any) => {
  const index = getToursIndex();
  if (!index) {
    console.warn('Algolia index not available');
    return;
  }

  try {
    const formattedTour = formatTourForAlgolia(tour);
    await index.saveObject(formattedTour);
    console.log(`Synced tour ${tour._id} to Algolia`);
  } catch (error) {
    console.error('Error syncing tour to Algolia:', error);
    throw error;
  }
};

// Sync multiple tours to Algolia
export const syncToursToAlgolia = async (tours: any[]) => {
  const index = getToursIndex();
  if (!index) {
    console.warn('Algolia index not available');
    return;
  }

  try {
    const formattedTours = tours.map(formatTourForAlgolia);
    await index.saveObjects(formattedTours);
    console.log(`Synced ${tours.length} tours to Algolia`);
  } catch (error) {
    console.error('Error syncing tours to Algolia:', error);
    throw error;
  }
};

// Delete a tour from Algolia
export const deleteTourFromAlgolia = async (tourId: string) => {
  const index = getToursIndex();
  if (!index) {
    console.warn('Algolia index not available');
    return;
  }

  try {
    await index.deleteObject(tourId);
    console.log(`Deleted tour ${tourId} from Algolia`);
  } catch (error) {
    console.error('Error deleting tour from Algolia:', error);
    throw error;
  }
};

// Clear all objects from the index
export const clearAlgoliaIndex = async () => {
  const index = getToursIndex();
  if (!index) {
    console.warn('Algolia index not available');
    return;
  }

  try {
    await index.clearObjects();
    console.log('Cleared Algolia index');
  } catch (error) {
    console.error('Error clearing Algolia index:', error);
    throw error;
  }
};

// Configure index settings
export const configureAlgoliaIndex = async () => {
  const index = getToursIndex();
  if (!index) {
    console.warn('Algolia index not available');
    return;
  }

  try {
    await index.setSettings({
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
        'filterOnly(category._id)',
        'filterOnly(destination._id)',
        'filterOnly(price)',
        'filterOnly(discountPrice)',
        'filterOnly(rating)',
        'filterOnly(duration)',
        'filterOnly(isPublished)',
        'filterOnly(isFeatured)'
      ],
      customRanking: [
        'desc(isFeatured)',
        'desc(rating)',
        'desc(bookings)',
        'desc(reviewCount)'
      ],
      ranking: [
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom'
      ],
      attributesToRetrieve: [
        'objectID',
        'title',
        'slug',
        'description',
        'location',
        'price',
        'discountPrice',
        'rating',
        'reviewCount',
        'duration',
        'image',
        'images',
        'tags',
        'category',
        'destination',
        'isPublished',
        'isFeatured',
        'highlights',
        'included',
        'excluded'
      ],
      attributesToHighlight: [
        'title',
        'description',
        'location'
      ],
      hitsPerPage: 20,
      maxValuesPerFacet: 100,
      removeWordsIfNoResults: 'lastWords',
      typoTolerance: true,
      ignorePlurals: true,
      queryType: 'prefixLast'
    });
    console.log('Configured Algolia index settings');
  } catch (error) {
    console.error('Error configuring Algolia index:', error);
    throw error;
  }
};
