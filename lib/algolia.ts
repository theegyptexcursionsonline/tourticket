// lib/algolia.ts
import { algoliasearch } from 'algoliasearch';

type SearchId = string | { toString(): string };
type TaxonomyRef = SearchId | { _id?: SearchId; name?: string; toString(): string };

interface AlgoliaTourSource {
  _id: SearchId;
  title?: string;
  slug?: string;
  description?: string;
  location?: string;
  price?: number;
  discountPrice?: number;
  rating?: number;
  reviewCount?: number;
  duration?: string | number;
  image?: string;
  images?: string[];
  tags?: string[];
  category?: TaxonomyRef;
  destination?: TaxonomyRef;
  isPublished?: boolean;
  isFeatured?: boolean;
  bookings?: number;
  highlights?: string[];
  included?: string[];
  excluded?: string[];
}

interface AlgoliaDestinationSource {
  _id: unknown;
  name?: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  country?: string;
  image?: string;
  images?: string[];
  highlights?: string[];
  thingsToDo?: string[];
  tags?: string[];
  keywords?: string[];
  isPublished?: boolean;
  featured?: boolean;
  tourCount?: number;
}

interface AlgoliaCategorySource {
  _id: unknown;
  name?: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  heroImage?: string;
  images?: string[];
  highlights?: string[];
  features?: string[];
  keywords?: string[];
  isPublished?: boolean;
  featured?: boolean;
  tourCount?: number;
  order?: number;
}

interface AlgoliaBlogSource {
  _id: SearchId;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  tags?: string[];
  author?: string;
  featuredImage?: string;
  images?: string[];
  status?: string;
  publishedAt?: string | Date | null;
  featured?: boolean;
  views?: number;
  likes?: number;
  readTime?: number;
}

const formatTaxonomyRef = (value?: TaxonomyRef) => {
  if (!value) return null;
  if (typeof value === 'string') return { _id: value, name: '' };
  if ('_id' in value || 'name' in value) {
    return { _id: String(value._id || value), name: value.name || '' };
  }
  return { _id: value.toString(), name: '' };
};

const taxonomyName = (value?: TaxonomyRef) =>
  value && typeof value !== 'string' && 'name' in value ? value.name || '' : '';

// Lazy-loaded Algolia client
let algoliaClientInstance: ReturnType<typeof algoliasearch> | null = null;

// Initialize Algolia client (lazy loading)
const getAlgoliaClient = () => {
  if (algoliaClientInstance) {
    return algoliaClientInstance;
  }

  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_WRITE_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY || process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;

  if (!appId || !apiKey) {
    console.warn('Algolia credentials not found. Search functionality will be limited.');
    return null;
  }

  algoliaClientInstance = algoliasearch(appId, apiKey);
  return algoliaClientInstance;
};

export const algoliaClient = getAlgoliaClient;

// Index names
export const ALGOLIA_INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'tours';
export const ALGOLIA_INDEX_DESTINATIONS = 'destinations';
export const ALGOLIA_INDEX_CATEGORIES = 'categories';
export const ALGOLIA_INDEX_BLOGS = 'blogs';

// Legacy export for backward compatibility
export const ALGOLIA_INDEX_NAME = ALGOLIA_INDEX_TOURS;

// Helper function to format tour data for Algolia
export const formatTourForAlgolia = (tour: AlgoliaTourSource) => {
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
    category: formatTaxonomyRef(tour.category),
    destination: formatTaxonomyRef(tour.destination),
    isPublished: tour.isPublished || false,
    isFeatured: tour.isFeatured || false,
    bookings: tour.bookings || 0,
    highlights: tour.highlights || [],
    included: tour.included || [],
    excluded: tour.excluded || [],
    _tags: [
      ...(tour.tags || []),
      taxonomyName(tour.category),
      taxonomyName(tour.destination),
      tour.location || ''
    ].filter(Boolean)
  };
};

// Sync a single tour to Algolia
export const syncTourToAlgolia = async (tour: AlgoliaTourSource) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    const formattedTour = formatTourForAlgolia(tour);
    await client.saveObject({
      indexName: ALGOLIA_INDEX_NAME,
      body: formattedTour
    });
    console.log(`Synced tour ${tour._id} to Algolia`);
  } catch (error) {
    console.error('Error syncing tour to Algolia:', error);
    throw error;
  }
};

// Sync multiple tours to Algolia
export const syncToursToAlgolia = async (tours: AlgoliaTourSource[]) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    const formattedTours = tours.map(formatTourForAlgolia);
    await client.saveObjects({
      indexName: ALGOLIA_INDEX_NAME,
      objects: formattedTours
    });
    console.log(`Synced ${tours.length} tours to Algolia`);
  } catch (error) {
    console.error('Error syncing tours to Algolia:', error);
    throw error;
  }
};

// Delete a tour from Algolia
export const deleteTourFromAlgolia = async (tourId: string) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    await client.deleteObject({
      indexName: ALGOLIA_INDEX_NAME,
      objectID: tourId
    });
    console.log(`Deleted tour ${tourId} from Algolia`);
  } catch (error) {
    console.error('Error deleting tour from Algolia:', error);
    throw error;
  }
};

// Clear all objects from the index
export const clearAlgoliaIndex = async () => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    await client.clearObjects({
      indexName: ALGOLIA_INDEX_NAME
    });
    console.log('Cleared Algolia index');
  } catch (error) {
    console.error('Error clearing Algolia index:', error);
    throw error;
  }
};

// Configure index settings
export const configureAlgoliaIndex = async () => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    await client.setSettings({
      indexName: ALGOLIA_INDEX_NAME,
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
      }
    });
    console.log('Configured Algolia index settings');
  } catch (error) {
    console.error('Error configuring Algolia index:', error);
    throw error;
  }
};

// =============================================================================
// DESTINATIONS
// =============================================================================

export const formatDestinationForAlgolia = (destination: AlgoliaDestinationSource) => {
  return {
    objectID: String(destination._id),
    name: destination.name || '',
    slug: destination.slug || '',
    description: destination.description || '',
    longDescription: destination.longDescription || '',
    country: destination.country || '',
    image: destination.image || '',
    images: destination.images || [],
    highlights: destination.highlights || [],
    thingsToDo: destination.thingsToDo || [],
    tags: destination.tags || [],
    keywords: destination.keywords || [],
    isPublished: destination.isPublished || false,
    featured: destination.featured || false,
    tourCount: destination.tourCount || 0,
    _tags: [
      ...(destination.tags || []),
      destination.country || '',
      destination.name || ''
    ].filter(Boolean)
  };
};

export const syncDestinationToAlgolia = async (destination: AlgoliaDestinationSource) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    const formatted = formatDestinationForAlgolia(destination);
    await client.saveObject({
      indexName: ALGOLIA_INDEX_DESTINATIONS,
      body: formatted
    });
    console.log(`Synced destination ${destination._id} to Algolia`);
  } catch (error) {
    console.error('Error syncing destination to Algolia:', error);
    throw error;
  }
};

export const syncDestinationsToAlgolia = async (destinations: AlgoliaDestinationSource[]) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    const formatted = destinations.map(formatDestinationForAlgolia);
    await client.saveObjects({
      indexName: ALGOLIA_INDEX_DESTINATIONS,
      objects: formatted
    });
    console.log(`Synced ${destinations.length} destinations to Algolia`);
  } catch (error) {
    console.error('Error syncing destinations to Algolia:', error);
    throw error;
  }
};

export const deleteDestinationFromAlgolia = async (destinationId: string) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    await client.deleteObject({
      indexName: ALGOLIA_INDEX_DESTINATIONS,
      objectID: destinationId
    });
    console.log(`Deleted destination ${destinationId} from Algolia`);
  } catch (error) {
    console.error('Error deleting destination from Algolia:', error);
    throw error;
  }
};

// =============================================================================
// CATEGORIES
// =============================================================================

export const formatCategoryForAlgolia = (category: AlgoliaCategorySource) => {
  return {
    objectID: String(category._id),
    name: category.name || '',
    slug: category.slug || '',
    description: category.description || '',
    longDescription: category.longDescription || '',
    heroImage: category.heroImage || '',
    images: category.images || [],
    highlights: category.highlights || [],
    features: category.features || [],
    keywords: category.keywords || [],
    isPublished: category.isPublished || false,
    featured: category.featured || false,
    tourCount: category.tourCount || 0,
    order: category.order || 0,
    _tags: [
      category.name || '',
      ...(category.keywords || [])
    ].filter(Boolean)
  };
};

export const syncCategoryToAlgolia = async (category: AlgoliaCategorySource) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    const formatted = formatCategoryForAlgolia(category);
    await client.saveObject({
      indexName: ALGOLIA_INDEX_CATEGORIES,
      body: formatted
    });
    console.log(`Synced category ${category._id} to Algolia`);
  } catch (error) {
    console.error('Error syncing category to Algolia:', error);
    throw error;
  }
};

export const syncCategoriesToAlgolia = async (categories: AlgoliaCategorySource[]) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    const formatted = categories.map(formatCategoryForAlgolia);
    await client.saveObjects({
      indexName: ALGOLIA_INDEX_CATEGORIES,
      objects: formatted
    });
    console.log(`Synced ${categories.length} categories to Algolia`);
  } catch (error) {
    console.error('Error syncing categories to Algolia:', error);
    throw error;
  }
};

export const deleteCategoryFromAlgolia = async (categoryId: string) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    await client.deleteObject({
      indexName: ALGOLIA_INDEX_CATEGORIES,
      objectID: categoryId
    });
    console.log(`Deleted category ${categoryId} from Algolia`);
  } catch (error) {
    console.error('Error deleting category from Algolia:', error);
    throw error;
  }
};

// =============================================================================
// BLOGS
// =============================================================================

export const formatBlogForAlgolia = (blog: AlgoliaBlogSource) => {
  return {
    objectID: blog._id.toString(),
    title: blog.title || '',
    slug: blog.slug || '',
    excerpt: blog.excerpt || '',
    content: blog.content || '',
    category: blog.category || '',
    tags: blog.tags || [],
    author: blog.author || '',
    featuredImage: blog.featuredImage || '',
    images: blog.images || [],
    status: blog.status || 'draft',
    publishedAt: blog.publishedAt || null,
    featured: blog.featured || false,
    views: blog.views || 0,
    likes: blog.likes || 0,
    readTime: blog.readTime || 0,
    _tags: [
      ...(blog.tags || []),
      blog.category || '',
      blog.author || ''
    ].filter(Boolean)
  };
};

export const syncBlogToAlgolia = async (blog: AlgoliaBlogSource) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    const formatted = formatBlogForAlgolia(blog);
    await client.saveObject({
      indexName: ALGOLIA_INDEX_BLOGS,
      body: formatted
    });
    console.log(`Synced blog ${blog._id} to Algolia`);
  } catch (error) {
    console.error('Error syncing blog to Algolia:', error);
    throw error;
  }
};

export const syncBlogsToAlgolia = async (blogs: AlgoliaBlogSource[]) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    const formatted = blogs.map(formatBlogForAlgolia);
    await client.saveObjects({
      indexName: ALGOLIA_INDEX_BLOGS,
      objects: formatted
    });
    console.log(`Synced ${blogs.length} blogs to Algolia`);
  } catch (error) {
    console.error('Error syncing blogs to Algolia:', error);
    throw error;
  }
};

export const deleteBlogFromAlgolia = async (blogId: string) => {
  const client = getAlgoliaClient();
  if (!client) {
    console.warn('Algolia client not available');
    return;
  }

  try {
    await client.deleteObject({
      indexName: ALGOLIA_INDEX_BLOGS,
      objectID: blogId
    });
    console.log(`Deleted blog ${blogId} from Algolia`);
  } catch (error) {
    console.error('Error deleting blog from Algolia:', error);
    throw error;
  }
};
