import { Destination } from '@/types';

export const destinations: Destination[] = [
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    slug: 'amsterdam',
    country: 'Netherlands',
    image: '/images/amsterdam.png',
    description: 'Discover the Venice of the North. Your next unforgettable adventure starts here, with our handpicked tours and activities.',
    longDescription: 'Amsterdam, the capital of the Netherlands, is a city of contrasts where historic charm meets modern innovation. Known for its artistic heritage, elaborate canal system, and narrow houses with gabled facades. The city is famous for its museums, including the Van Gogh Museum, Rijksmuseum, and Anne Frank House.',
    featured: true,
    tourCount: 45,
    coordinates: {
      lat: 52.3676,
      lng: 4.9041
    },
    highlights: [
      'Historic canal ring UNESCO World Heritage',
      'World-class museums',
      'Vibrant nightlife',
      'Bike-friendly city',
      'Rich cultural heritage'
    ],
    bestTimeToVisit: 'April to October',
    currency: 'EUR',
    timezone: 'CET'
  },
  {
    id: 'berlin',
    name: 'Berlin',
    slug: 'berlin',
    country: 'Germany',
    image: '/images/berlin.png',
    description: 'Experience the dynamic capital of Germany with its rich history and vibrant culture.',
    longDescription: 'Berlin, Germany\'s capital, is a city steeped in history yet pulsing with contemporary energy. From the remnants of the Berlin Wall to world-class museums and a thriving arts scene, Berlin offers visitors a unique blend of past and present.',
    featured: true,
    tourCount: 32,
    coordinates: {
      lat: 52.5200,
      lng: 13.4050
    },
    highlights: [
      'Brandenburg Gate',
      'Museum Island',
      'Berlin Wall Memorial',
      'Vibrant street art scene',
      'Rich historical sites'
    ],
    bestTimeToVisit: 'May to September',
    currency: 'EUR',
    timezone: 'CET'
  },
  {
    id: 'copenhagen',
    name: 'Copenhagen',
    slug: 'copenhagen',
    country: 'Denmark',
    image: '/images/3.png',
    description: 'Explore the charming Danish capital known for its design, cuisine, and fairy-tale atmosphere.',
    longDescription: 'Copenhagen, the capital of Denmark, is a city that effortlessly blends historic charm with modern Scandinavian design. Known for its colorful harbors, world-class cuisine, and the fairy-tale legacy of Hans Christian Andersen.',
    featured: true,
    tourCount: 28,
    coordinates: {
      lat: 55.6761,
      lng: 12.5683
    },
    highlights: [
      'Colorful Nyhavn harbor',
      'Tivoli Gardens',
      'The Little Mermaid statue',
      'Danish design heritage',
      'Michelin-starred restaurants'
    ],
    bestTimeToVisit: 'June to August',
    currency: 'DKK',
    timezone: 'CET'
  },
  {
    id: 'rotterdam',
    name: 'Rotterdam',
    slug: 'rotterdam',
    country: 'Netherlands',
    image: '/images/4.png',
    description: 'Discover the modern architectural marvel of the Netherlands.',
    longDescription: 'Rotterdam is the Netherlands\' second-largest city and a major port city. Known for its modern architecture, innovative urban planning, and vibrant cultural scene.',
    featured: false,
    tourCount: 18,
    coordinates: {
      lat: 51.9244,
      lng: 4.4777
    },
    highlights: [
      'Modern architecture',
      'Erasmus Bridge',
      'Cube Houses',
      'Maritime heritage',
      'Dynamic port'
    ],
    bestTimeToVisit: 'April to October',
    currency: 'EUR',
    timezone: 'CET'
  },
  {
    id: 'stockholm',
    name: 'Stockholm',
    slug: 'stockholm',
    country: 'Sweden',
    image: '/images/5.png',
    description: 'Experience the beauty of the Venice of the North with its stunning archipelago.',
    longDescription: 'Stockholm, the capital of Sweden, is built on 14 islands connected by over 50 bridges. Known for its beautiful old town, royal palaces, and modern design.',
    featured: false,
    tourCount: 22,
    coordinates: {
      lat: 59.3293,
      lng: 18.0686
    },
    highlights: [
      'Gamla Stan old town',
      'Royal Palace',
      'ABBA Museum',
      'Beautiful archipelago',
      'Nobel Prize heritage'
    ],
    bestTimeToVisit: 'June to August',
    currency: 'SEK',
    timezone: 'CET'
  }
];

export const getDestinationById = (id: string): Destination | undefined => {
  return destinations.find(dest => dest.id === id || dest.slug === id);
};

export const getFeaturedDestinations = (): Destination[] => {
  return destinations.filter(dest => dest.featured);
};

export const getAllDestinations = (): Destination[] => {
  return destinations;
};