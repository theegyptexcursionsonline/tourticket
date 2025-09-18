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

// NEW: Availability interfaces to match our Tour model
export interface AvailabilitySlot {
  time: string;
  capacity: number;
}

export interface Availability {
  type: 'daily' | 'date_range' | 'specific_dates';
  availableDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startDate?: string;
  endDate?: string;
  specificDates?: string[];
  slots: AvailabilitySlot[];
  blockedDates?: string[];
}

// NEW: Itinerary item interface
export interface ItineraryItem {
  day: number;
  title: string;
  description: string;
}

// NEW: FAQ interface
export interface FAQ {
  question: string;
  answer: string;
}

// NEW: Booking Option interface
export interface BookingOption {
  type: string;
  label: string;
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
  // NEW: Added missing fields from our enhanced model
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  itinerary?: ItineraryItem[];
  faqs?: FAQ[];
  bookingOptions?: BookingOption[];
  addOns?: AddOn[];
  isPublished?: boolean;
  difficulty?: string;
  maxGroupSize?: number;
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
  category?: Category;
  destinationId: string;
  categoryIds: string[];
  availability?: Availability;
  featured?: boolean;
  quantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

// NEW: PopulatedTour interface for server-side data fetching
export interface PopulatedTour extends Omit<Tour, 'destination' | 'category' | 'destinationId' | 'categoryIds'> {
  destination: Destination;
  category: Category;
  reviews?: Review[];
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

// FIXED: Updated to match our actual backend structure
export interface Booking {
  _id: string;
  tour: Tour | string; // Can be populated or just ID
  user: User | string; // Can be populated or just ID
  date: string;
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
  firstName?: string; // Added to match our User model
  lastName?: string;   // Added to match our User model
  picture?: string;
  favorites: string[];
  bookings: Booking[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string; // FIXED: Changed from id to _id to match MongoDB
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
  tour?: Tour; // For populated reviews
  user?: User; // For populated reviews
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

// NEW: Admin-specific interfaces
export interface AdminStats {
  totalTours: number;
  totalBookings: number;
  totalUsers: number;
  totalRevenue: number;
  recentBookingsCount: number;
  recentActivities: Array<{
    id: string;
    text: string;
  }>;
}

// NEW: Form data interface for tour editing
export interface TourFormData {
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  duration: string;
  discountPrice: string | number;
  originalPrice: string | number;
  destination: string;
  categories: string[];
  image: string;
  images: string[];
  highlights: string[];
  includes: string[];
  whatsIncluded: string[];
  whatsNotIncluded: string[];
  itinerary: ItineraryItem[];
  faqs: FAQ[];
  bookingOptions: BookingOption[];
  addOns: AddOn[];
  isPublished: boolean;
  difficulty: string;
  maxGroupSize: number;
  tags: string;
  isFeatured: boolean;
  availability: Availability;
}