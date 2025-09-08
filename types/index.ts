// types/index.ts

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  country: string;
  image: string;
  description: string;
  longDescription?: string;
  featured: boolean;
  tourCount: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  highlights?: string[];
  thingsToDo?: string[];
  bestTimeToVisit?: string;
  currency?: string;
  timezone?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  color: string;
  tourCount: number;
}

export interface Tour {
  id: number | string;
  title: string;
  slug: string;
  image: string;
  images?: string[];
  discountPrice: number;
  originalPrice?: number;
  duration?: string;
  rating?: number;
  bookings?: number;
  tags?: string[];
  description?: string;
  longDescription?: string;
  highlights?: string[];
  includes?: string[];
  excludes?: string[];
  meetingPoint?: string;
  languages?: string[];
  ageRestriction?: string;
  cancellationPolicy?: string;
  operatedBy?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  destinationId: string;
  categoryIds: string[];
  availability?: {
    date: string;
    slots: string[];
    available: boolean;
  }[];
  featured?: boolean;
  quantity?: number;
}

export interface CartItem extends Tour {
  quantity: number;
  selectedDate?: string;
  selectedTime?: string;
  details?: string;
}

export interface Booking {
  id: string;
  tourId: string;
  userId: string;
  tourTitle: string;
  tourImage: string;
  date: string;
  time: string;
  guests: number;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  bookingReference: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  favorites: string[];
  bookings: Booking[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  tourId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  author: string;
  authorAvatar?: string; // optional avatar for blog author
  publishedAt: string;   // ISO date string recommended
  readTime: number;      // minutes to read
  tags: string[];
}

export interface SearchFilters {
  destination?: string;
  category?: string;
  priceRange?: [number, number];
  duration?: string;
  rating?: number;
  dateRange?: [string, string];
}

export interface SearchResult {
  tours: Tour[];
  destinations: Destination[];
  total: number;
  page: number;
  limit: number;
}
