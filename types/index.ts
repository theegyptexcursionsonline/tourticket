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
  _id: string;
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
  _id: string;
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  color: string;
  tourCount: number;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface Tour {
  _id: string;
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
  destination?: Destination;
  categories?: Category[];
  destinationId: string;
  categoryIds: string[];
  availability?: any;
  featured?: boolean;
  quantity?: number; // General quantity, for compatibility
  addOns?: AddOn[]; // Optional addons for a tour
}

export interface CartItem extends Tour {
  uniqueId?: string;
  quantity: number; // This will represent the number of adults
  childQuantity: number;
  selectedDate: string;
  selectedTime: string;
  selectedLanguage?: string;
  selectedAddOns?: AddOn[];
  details?: string;
  totalPrice?: number;
}

// MODIFIED: This interface now correctly matches the backend Mongoose model.
export interface Booking {
  _id: string;
  tour: Tour; // The API populates this, so it should be the Tour object
  user: User; // The API populates this
  date: string; // Dates are serialized to strings
  time: string;
  guests: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}


export interface User {
  _id: string;
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
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  author: string;
  authorAvatar?: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
  status: 'published' | 'draft';
  createdAt?: string;
  updatedAt?: string;
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