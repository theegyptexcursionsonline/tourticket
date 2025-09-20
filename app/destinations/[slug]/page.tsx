import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import { Tour, Destination, Category } from '@/types';
import DestinationPageClient from './DestinationPageClient'; 

// Mock/fallback tours data for destinations with no tours
const generateMockTours = (destination: any): Tour[] => {
  const mockTours = [
    {
      _id: `mock-1-${destination._id}`,
      title: `Best of ${destination.name} Walking Tour`,
      slug: `best-of-${destination.slug}-walking-tour`,
      image: destination.image || 'https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?w=800&h=600&fit=crop',
      discountPrice: 45,
      originalPrice: 60,
      duration: '3 hours',
      rating: 4.7,
      bookings: 234,
      tags: ['Walking Tour', 'City Highlights', 'Small Group'],
      description: `Discover the highlights of ${destination.name} on this comprehensive walking tour. Visit iconic landmarks, learn about local history, and get insider tips from our expert guides.`,
      longDescription: `Join us for an unforgettable journey through ${destination.name}! This carefully crafted walking tour takes you through the most significant sites and hidden gems of the city. Our passionate local guides will share fascinating stories, historical insights, and cultural anecdotes that bring ${destination.name} to life. Perfect for first-time visitors and those wanting to deepen their understanding of this remarkable destination.`,
      highlights: [
        `Visit ${destination.name}'s most iconic landmarks`,
        'Learn fascinating history from expert local guides',
        'Discover hidden gems off the beaten path',
        'Small group experience with personalized attention',
        'Perfect introduction to the city'
      ],
      includes: [
        'Professional local guide',
        'Walking tour of main attractions',
        'Historical commentary and stories',
        'Tips for exploring on your own',
        'Small group experience (max 15 people)'
      ],
      destination: destination,
      category: { _id: 'mock-cat-1', name: 'Cultural Tours', slug: 'cultural-tours' },
      difficulty: 'Easy',
      maxGroupSize: 15,
      meetingPoint: `Central meeting point in ${destination.name} (details provided upon booking)`,
      languages: ['English', 'Spanish'],
      cancellationPolicy: 'Free cancellation up to 24 hours before start time',
      isPublished: true,
      isFeatured: true
    },
    {
      _id: `mock-2-${destination._id}`,
      title: `${destination.name} Food & Culture Experience`,
      slug: `${destination.slug}-food-culture-experience`,
      image: destination.image || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
      discountPrice: 75,
      originalPrice: 95,
      duration: '4 hours',
      rating: 4.8,
      bookings: 189,
      tags: ['Food Tour', 'Cultural Experience', 'Local Markets'],
      description: `Taste your way through ${destination.name} while learning about local culture, traditions, and culinary heritage. Perfect for food lovers and culture enthusiasts.`,
      longDescription: `Embark on a delicious journey through ${destination.name}'s culinary landscape! This immersive food and culture tour combines tastings at local markets, traditional restaurants, and hidden culinary gems with insights into the area's rich cultural heritage. You'll sample authentic local specialties, meet passionate food artisans, and gain a deeper appreciation for ${destination.name}'s unique gastronomic traditions.`,
      highlights: [
        'Taste authentic local specialties and traditional dishes',
        'Visit bustling local markets and food establishments',
        'Meet local food artisans and learn their stories',
        'Discover the cultural significance of regional cuisine',
        'Small group experience with local guide'
      ],
      includes: [
        'Expert food guide',
        'Multiple food tastings and samples',
        'Visit to local markets',
        'Cultural commentary and history',
        'Recipe cards to take home'
      ],
      destination: destination,
      category: { _id: 'mock-cat-2', name: 'Food Tours', slug: 'food-tours' },
      difficulty: 'Easy',
      maxGroupSize: 12,
      meetingPoint: `Main market square in ${destination.name}`,
      languages: ['English'],
      cancellationPolicy: 'Free cancellation up to 24 hours before start time',
      isPublished: true,
      isFeatured: false
    },
    {
      _id: `mock-3-${destination._id}`,
      title: `${destination.name} Photography Tour`,
      slug: `${destination.slug}-photography-tour`,
      image: destination.image || 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=600&fit=crop',
      discountPrice: 85,
      originalPrice: 110,
      duration: '5 hours',
      rating: 4.6,
      bookings: 156,
      tags: ['Photography', 'Scenic Views', 'Professional Guide'],
      description: `Capture the beauty of ${destination.name} with a professional photographer guide. Learn composition techniques while visiting the most photogenic spots.`,
      longDescription: `Perfect your photography skills while exploring the most beautiful and photogenic locations in ${destination.name}! Led by a professional photographer, this tour combines technical instruction with local knowledge to help you capture stunning images. Whether you're a beginner or experienced photographer, you'll discover new perspectives and techniques while exploring hidden viewpoints and iconic scenes.`,
      highlights: [
        'Professional photographer guide and instruction',
        'Visit the most photogenic spots in the city',
        'Learn composition and technical techniques',
        'Capture golden hour lighting opportunities',
        'Small group for personalized attention'
      ],
      includes: [
        'Professional photographer guide',
        'Photography tips and techniques',
        'Visit to scenic viewpoints',
        'Digital photography guide',
        'Small group experience (max 8 people)'
      ],
      destination: destination,
      category: { _id: 'mock-cat-3', name: 'Photography Tours', slug: 'photography-tours' },
      difficulty: 'Moderate',
      maxGroupSize: 8,
      meetingPoint: `Photography meeting point in ${destination.name} (location sent before tour)`,
      languages: ['English'],
      cancellationPolicy: 'Free cancellation up to 48 hours before start time',
      isPublished: true,
      isFeatured: false
    }
  ];

  return mockTours as Tour[];
};

// Mock categories for fallback
const getMockCategories = (): Category[] => {
  return [
    { _id: 'mock-cat-1', name: 'Cultural Tours', slug: 'cultural-tours', icon: '🏛️' },
    { _id: 'mock-cat-2', name: 'Food Tours', slug: 'food-tours', icon: '🍴' },
    { _id: 'mock-cat-3', name: 'Photography Tours', slug: 'photography-tours', icon: '📸' },
    { _id: 'mock-cat-4', name: 'Adventure Tours', slug: 'adventure-tours', icon: '🏔️' },
    { _id: 'mock-cat-5', name: 'Art & History', slug: 'art-history', icon: '🎨' },
    { _id: 'mock-cat-6', name: 'Nature Tours', slug: 'nature-tours', icon: '🌿' }
  ];
};

// This function tells Next.js which destination pages to pre-build.
export async function generateStaticParams() {
  await dbConnect();
  const destinations = await DestinationModel.find({}).select('slug').lean();
  return destinations.map((dest) => ({
    slug: dest.slug,
  }));
}

// This function fetches all the necessary data for the destination page on the server.
async function getPageData(slug: string) {
  await dbConnect();

  const destination = await DestinationModel.findOne({ slug }).lean();
  if (!destination) {
    return { destination: null, destinationTours: [], allCategories: [] };
  }

  let destinationTours = await TourModel.find({ destination: destination._id }).lean();
  let allCategories = await CategoryModel.find({}).lean();

  // If no real tours found, use mock data
  if (!destinationTours || destinationTours.length === 0) {
    console.log(`No tours found for ${destination.name}, using mock data`);
    destinationTours = generateMockTours(destination);
    
    // Update destination with mock tour count
    destination.tourCount = destinationTours.length;
  }

  // If no categories found, use mock categories
  if (!allCategories || allCategories.length === 0) {
    allCategories = getMockCategories();
  }

  // Serialize data to pass to client component
  const serializedDestination = JSON.parse(JSON.stringify(destination));
  const serializedTours = JSON.parse(JSON.stringify(destinationTours));
  const serializedCategories = JSON.parse(JSON.stringify(allCategories));

  return { 
    destination: serializedDestination, 
    destinationTours: serializedTours, 
    allCategories: serializedCategories 
  };
}

// This is the main Page component. It's a Server Component.
export default async function DestinationPage({ params }: { params: { slug: string } }) {
  const { destination, destinationTours, allCategories } = await getPageData(params.slug);

  if (!destination) {
    notFound();
  }

  // Render the Client Component and pass the fetched data as props.
  return (
    <DestinationPageClient
      destination={destination}
      destinationTours={destinationTours}
      allCategories={allCategories}
    />
  );
}