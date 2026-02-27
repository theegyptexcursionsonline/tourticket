import { Tour, Destination, SearchFilters, SearchResult } from '@/types';

// Static data arrays - previously loaded from lib/data files
const tours: Tour[] = [];
const destinations: Destination[] = [];

export function performAdvancedSearch(
  query: string,
  filters: SearchFilters,
  page: number = 1,
  limit: number = 12
): SearchResult {
  let filteredTours = [...tours];
  let filteredDestinations = [...destinations];

  // Text search
  if (query.trim()) {
    const searchTerm = query.toLowerCase();
    
    filteredTours = filteredTours.filter(tour =>
      tour.title.toLowerCase().includes(searchTerm) ||
      tour.description?.toLowerCase().includes(searchTerm) ||
      tour.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );

    filteredDestinations = filteredDestinations.filter(dest =>
      dest.name.toLowerCase().includes(searchTerm) ||
      dest.description.toLowerCase().includes(searchTerm)
    );
  }

  // Apply filters
  if (filters.destination) {
    filteredTours = filteredTours.filter(tour => {
      const destId = typeof tour.destination === 'string' ? tour.destination : tour.destination?._id;
      return destId === filters.destination;
    });
  }

  if (filters.category) {
    filteredTours = filteredTours.filter(tour => {
      const cat = tour.category;
      const catId = typeof cat === 'string' ? cat : (cat as any)?._id;
      return catId === filters.category;
    });
  }

  if (filters.priceRange) {
    filteredTours = filteredTours.filter(tour =>
      tour.discountPrice >= filters.priceRange![0] &&
      tour.discountPrice <= filters.priceRange![1]
    );
  }

  if (filters.rating) {
    filteredTours = filteredTours.filter(tour => (tour.rating || 0) >= filters.rating!);
  }

  // Pagination
  const total = filteredTours.length;
  const startIndex = (page - 1) * limit;
  const paginatedTours = filteredTours.slice(startIndex, startIndex + limit);

  return {
    tours: paginatedTours,
    destinations: query.trim() ? filteredDestinations.slice(0, 5) : [],
    total,
    page,
    limit
  };
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

export function getRelatedTours(tour: Tour, limit: number = 3): Tour[] {
  return tours
    .filter(t =>
      t.id !== tour.id &&
      (t.destination === tour.destination ||
       t.category === tour.category)
    )
    .slice(0, limit);
}