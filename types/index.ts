// types/index.ts

// =================================================================
// CORE ENTITIES
// =================================================================

export interface User {
  _id: string;
  id: string; // Often included for client-side consistency
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  favorites?: string[]; // Array of Tour IDs
  bookings?: Booking[]; // Populated bookings
  createdAt?: string;
  updatedAt?: string;
}

export interface Destination {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  country?: string;
  image: string;
  description: string;
  longDescription?: string;
  featured?: boolean;
  tourCount?: number;
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
  id?: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  color?: string;
  tourCount?: number;
}

// =================================================================
// TOUR-SPECIFIC SUB-INTERFACES
// =================================================================

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

export interface ItineraryItem {
  time?: string;
  title: string;
  description: string;
  duration?: string;
  location?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface BookingOption {
  type: string;
  label: string;
  price: number;
  originalPrice?: number;
  description?: string;
  duration?: string;
  languages?: string[];
  highlights?: string[];
  groupSize?: string;
  difficulty?: string;
  badge?: string;
  discount?: number;
  isRecommended?: boolean;
}

export interface AddOn {
  name: string;
  description: string;
  price: number;
}


// =================================================================
// TOUR & REVIEW INTERFACES
// =================================================================

export interface Tour {
  _id: string;
  id?: string | number; // For client-side mapping if needed
  title: string;
  slug: string;
  image: string;
  images?: string[];
  discountPrice: number;
  originalPrice?: number;
  price?: number; // Can be used as an alias for discountPrice
  duration: string;
  rating?: number;
  bookings?: number;
  tags?: string[];
  description: string;
  longDescription?: string;
  highlights?: string[];
  includes?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  itinerary?: ItineraryItem[];
  faq?: FAQ[]; // Note: schema has 'faq' not 'faqs'
  bookingOptions?: BookingOption[];
  addOns?: AddOn[];
  isPublished?: boolean;
  isFeatured?: boolean;
  difficulty?: string;
  maxGroupSize?: number;
  meetingPoint?: string;
  languages?: string[];
  ageRestriction?: string;
  cancellationPolicy?: string;
  operatedBy?: string;
  destination: Destination | string; // Can be populated or just ID
  category: Category | string;     // Can be populated or just ID
  availability?: Availability;
  reviews?: Review[]; // Can be populated
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  _id: string;
  tourId: string; // Changed from 'tour'
  userId: string; // Changed from 'user'
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
  createdAt?: string;
  updatedAt?: string;
}

// A more specific type for tours when destination and category are guaranteed to be populated
export interface PopulatedTour extends Omit<Tour, 'destination' | 'category' | 'reviews'> {
  destination: Destination;
  category: Category;
  reviews?: Review[];
}


// =================================================================
// CONTEXT & CLIENT-SIDE INTERFACES
// =================================================================
export interface CartItem extends Tour {
  uniqueId: string; // Unique identifier for this specific cart item instance
  quantity: number;   // Represents the number of adults
  childQuantity: number;
  infantQuantity: number;
  selectedDate: string;
  selectedTime: string;
  selectedAddOns: { [key: string]: number }; // Maps AddOn ID to quantity
  selectedAddOnDetails?: { // Store full add-on details for cart display
    [key: string]: {
      id: string;
      title: string;
      price: number;
      category: string;
      perGuest: boolean;
    }
  };
  selectedBookingOption?: { // Store selected booking option details
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  totalPrice: number;
}

// Add this to your existing types/index.ts file

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  images?: string[];
  category: string;
  tags: string[];
  author: string;
  authorAvatar?: string;
  authorBio?: string;
  metaTitle?: string;
  metaDescription?: string;
  readTime: number;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  scheduledFor?: string;
  featured: boolean;
  allowComments: boolean;
  views: number;
  likes: number;
  relatedDestinations?: Destination[];
  relatedTours?: Tour[];
  createdAt?: string;
  updatedAt?: string;
}
export interface Booking {
  _id: string;
  tour: Tour | string;
  user: User | string;
  bookingDate: string; // Renamed from 'date' for clarity
  bookingTime: string; // Renamed from 'time' for clarity
  adults: number;
  children: number;
  infants: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  paymentId?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

// =================================================================
// UTILITY & OTHER INTERFACES
// =================================================================

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

// =================================================================
// ADMIN-SPECIFIC INTERFACES
// =================================================================

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

export interface TourFormData {
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  duration: string;
  discountPrice: string | number;
  originalPrice: string | number;
  destination: string;
  category: string; // Tour model uses 'category', not 'categories'
  image: string;
  images: string[];
  highlights: string[];
  includes: string[];
  whatsIncluded: string[];
  whatsNotIncluded: string[];
  itinerary: ItineraryItem[];
  faqs: FAQ[]; // Mapped from 'faq' in the form
  bookingOptions: BookingOption[];
  addOns: AddOn[];
  isPublished: boolean;
  difficulty: string;
  maxGroupSize: number;
  tags: string;
  isFeatured: boolean;
  availability: Availability;
}