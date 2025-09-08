import { Tour } from '@/types';

export const tours: Tour[] = [
  {
    id: 'new-york-pizza-lovers-canal-cruise',
    title: 'New York Pizza by LOVERS Canal Cruise in Amsterdam',
    slug: 'new-york-pizza-lovers-canal-cruise',
    image: '/images2/2.png',
    images: ['/images2/2.png', '/images2/1.png', '/images2/3.png', '/images2/4.png'],
    duration: '75 minutes',
    rating: 4.6,
    bookings: 21080,
    originalPrice: 43.50,
    discountPrice: 37.50,
    tags: ['-15%', 'With food', 'On the water'],
    description: 'Complete your visit to Amsterdam with this unique New York Pizza by LOVERS canal cruise! Enjoy an oven-fresh pizza, drinks and an ice cream on board as you cruise the Amsterdam canals.',
    longDescription: 'Experience Amsterdam like never before with our unique New York Pizza by LOVERS canal cruise. This 75-minute journey combines sightseeing with delicious dining as you glide through the historic Amsterdam canals. Our comfortable boats feature large windows providing panoramic views of the city\'s iconic canal houses, bridges, and historic landmarks. Each guest receives a freshly baked New York-style pizza, choice of beverages including Heineken beer, wine, soft drinks, and water, plus a delicious Cookie Dough Chocolate Chip Ice Cream for dessert.',
    highlights: [
      'A New York Pizza per person',
      'Drinks: Heineken beer, wine, soft drinks and water',
      'Cookie Dough Chocolate Chip Ice Cream',
      'Admire the Amsterdam canals, official UNESCO World Heritage',
      'Sightseeing, pizza and drinks all in one!',
      'Professional crew and commentary',
      'Panoramic windows for best views'
    ],
    includes: [
      'A New York Pizza per person',
      'Drinks: Heineken beer, wine, soft drinks and water',
      'Cookie Dough Chocolate Chip Ice Cream',
      'Professional crew and commentary',
      'Life jackets and safety equipment',
      'Live commentary about Amsterdam history'
    ],
    excludes: [
      'Hotel pickup and drop-off',
      'Gratuities',
      'Additional drinks beyond included selection'
    ],
    meetingPoint: 'LOVERS Cafe, Prins Hendrikkade 25, 1012 TM Amsterdam',
    languages: ['English', 'Dutch', 'German', 'French'],
    ageRestriction: 'Child ticket for 4-13 year olds. Free access for children 0-3 years.',
    cancellationPolicy: 'Free cancellation up to 8 hours in advance',
    operatedBy: 'LOVERS Canal Cruises',
    location: {
      lat: 52.3740,
      lng: 4.9010,
      address: 'Prins Hendrikkade 25, 1012 TM Amsterdam'
    },
    destinationId: 'amsterdam',
    categoryIds: ['canal-cruises', 'food-tours'],
    featured: true,
    availability: [
      {
        date: '2025-01-10',
        slots: ['17:45', '18:00', '18:30', '19:00', '19:30', '20:00'],
        available: true
      }
    ]
  },
  {
    id: '1-hour-amsterdam-canal-cruise',
    title: '1 Hour Amsterdam Canal Cruise',
    slug: '1-hour-amsterdam-canal-cruise',
    image: '/images2/1.png',
    images: ['/images2/1.png', '/images2/2.png', '/images2/3.png'],
    duration: '60 minutes',
    rating: 4.5,
    bookings: 4506416,
    originalPrice: 20,
    discountPrice: 15.50,
    tags: ['Online only deal', 'Staff favourite', '-25%'],
    description: 'Experience Amsterdam from a unique perspective with our 1-hour canal cruise. Sail through the city\'s historic waterways, marvel at the iconic canal houses, and learn about Amsterdam\'s rich history with our audio guide.',
    longDescription: 'Discover Amsterdam\'s beauty from the water on this classic 1-hour canal cruise. Navigate through the historic canal ring, a UNESCO World Heritage site, while learning about the city\'s 800-year history. Our comfortable glass-topped boats provide unobstructed views of Amsterdam\'s famous architecture, from medieval buildings to elegant 17th-century merchant houses. Perfect for first-time visitors and those wanting a relaxing introduction to the city.',
    highlights: [
      'See the famous canal houses and bridges',
      'Audio guide available in multiple languages',
      'Perfect for first-time visitors',
      'Departs from a central location',
      'Professional commentary about Amsterdam history',
      'UNESCO World Heritage canal ring',
      'Glass-topped boats for best views'
    ],
    includes: [
      'Audio guide in multiple languages',
      'Professional tour guide',
      'Life jackets and safety equipment',
      'Onboard restroom facilities'
    ],
    excludes: [
      'Food and drinks (available for purchase)',
      'Hotel transfers',
      'Gratuities'
    ],
    meetingPoint: 'Central Station, Pier 5, Amsterdam',
    languages: ['English', 'Dutch', 'German', 'French', 'Spanish', 'Italian'],
    ageRestriction: 'Suitable for all ages',
    cancellationPolicy: 'Free cancellation up to 24 hours in advance',
    operatedBy: 'Amsterdam Canal Tours',
    location: {
      lat: 52.3785,
      lng: 4.9004,
      address: 'Stationsplein, 1012 AB Amsterdam'
    },
    destinationId: 'amsterdam',
    categoryIds: ['canal-cruises', 'sightseeing'],
    featured: true
  },
  {
    id: 'amsterdam-evening-night-cruise',
    title: 'Amsterdam Evening & Night Boat Tour',
    slug: 'amsterdam-evening-night-cruise',
    image: '/images2/3.png',
    images: ['/images2/3.png', '/images2/1.png', '/images2/2.png'],
    duration: '60 minutes',
    rating: 4.5,
    bookings: 1256854,
    originalPrice: 20,
    discountPrice: 15.50,
    tags: ['Staff favourite', '-25%'],
    description: 'See Amsterdam illuminated at night on this magical evening canal cruise.',
    longDescription: 'As the sun sets over Amsterdam, embark on a magical evening cruise through the illuminated canals. Watch as the city transforms into a sparkling wonderland with thousands of lights reflecting off the water. This romantic evening cruise showcases Amsterdam\'s most beautiful bridges and historic buildings lit up against the night sky. Perfect for couples and photography enthusiasts.',
    highlights: [
      'Beautiful city lights reflection on water',
      'Romantic evening atmosphere',
      'Historic canal district at night',
      'Professional commentary',
      'Perfect for photography',
      'Illuminated bridges and buildings'
    ],
    includes: [
      'Professional tour guide',
      'Evening canal cruise',
      'Safety equipment',
      'Commentary in multiple languages'
    ],
    excludes: [
      'Food and drinks',
      'Hotel transfers',
      'Photography services'
    ],
    meetingPoint: 'Anne Frank House area, Amsterdam',
    languages: ['English', 'Dutch', 'German', 'French'],
    ageRestriction: 'Suitable for all ages',
    cancellationPolicy: 'Free cancellation up to 24 hours in advance',
    operatedBy: 'Amsterdam Evening Tours',
    location: {
      lat: 52.3740,
      lng: 4.8839,
      address: 'Prinsengracht 267, 1016 GV Amsterdam'
    },
    destinationId: 'amsterdam',
    categoryIds: ['canal-cruises', 'romantic'],
    featured: true
  },
  {
    id: 'countryside-windmills-tour',
    title: 'Countryside & Windmills Tour from Amsterdam',
    slug: 'countryside-windmills-tour',
    image: '/images/6.png',
    images: ['/images/6.png', '/images/7.png', '/images/8.png'],
    duration: '6 hours',
    rating: 4.4,
    bookings: 20568,
    originalPrice: 59,
    discountPrice: 37.50,
    tags: ['Operated by Egypt Excursions Online', 'Staff favourite', '-35%'],
    description: 'Explore the beautiful Dutch countryside and visit traditional windmills on this full-day tour from Amsterdam.',
    longDescription: 'Escape the city and discover the authentic Dutch countryside on this comprehensive 6-hour tour. Visit historic windmills still in operation, learn about traditional Dutch crafts like cheese-making and clog-carving, and explore picturesque villages that showcase the Netherlands\' rich cultural heritage.',
    highlights: [
      'Visit authentic working windmills',
      'Explore picturesque Dutch countryside',
      'Learn about traditional Dutch culture',
      'Professional tour guide included',
      'Traditional cheese tasting',
      'Clog-making demonstration'
    ],
    includes: [
      'Professional tour guide',
      'Transportation by luxury coach',
      'Windmill entrance fees',
      'Cheese tasting',
      'Clog-making demonstration'
    ],
    excludes: [
      'Lunch',
      'Additional entrance fees',
      'Personal expenses'
    ],
    meetingPoint: 'Central Station, main entrance, Amsterdam',
    languages: ['English', 'Dutch'],
    ageRestriction: 'Suitable for all ages',
    cancellationPolicy: 'Free cancellation up to 24 hours in advance',
    operatedBy: 'Egypt Excursions Online',
    location: {
      lat: 52.3785,
      lng: 4.9004,
      address: 'Stationsplein, 1012 AB Amsterdam'
    },
    destinationId: 'amsterdam',
    categoryIds: ['day-trips', 'cultural'],
    featured: true
  },
  // Add more tours for other destinations
  {
    id: 'berlin-walking-tour',
    title: 'Berlin Historical Walking Tour',
    slug: 'berlin-walking-tour',
    image: '/images/berlin-tour.png',
    duration: '3 hours',
    rating: 4.7,
    bookings: 15420,
    discountPrice: 25,
    tags: ['Historical', 'Walking tour'],
    description: 'Discover Berlin\'s fascinating history on this comprehensive walking tour.',
    longDescription: 'Walk through Berlin\'s tumultuous history from the Brandenburg Gate to remnants of the Berlin Wall. This expert-guided tour covers major historical sites and hidden gems.',
    highlights: [
      'Brandenburg Gate',
      'Holocaust Memorial',
      'Berlin Wall remnants',
      'Expert historical guide'
    ],
    includes: [
      'Professional guide',
      'Small group experience',
      'Historical insights'
    ],
    destinationId: 'berlin',
    categoryIds: ['walking-tours', 'historical'],
    featured: false
  }
];

export const getTourById = (id: string): Tour | undefined => {
  return tours.find(tour => tour.id === id || tour.slug === id);
};

export const getToursByDestination = (destinationId: string): Tour[] => {
  return tours.filter(tour => tour.destinationId === destinationId);
};

export const getToursByCategory = (categoryId: string): Tour[] => {
  return tours.filter(tour => tour.categoryIds.includes(categoryId));
};

export const getFeaturedTours = (): Tour[] => {
  return tours.filter(tour => tour.featured);
};

export const searchTours = (query: string): Tour[] => {
  const searchTerm = query.toLowerCase();
  return tours.filter(tour =>
    tour.title.toLowerCase().includes(searchTerm) ||
    tour.description?.toLowerCase().includes(searchTerm) ||
    tour.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};