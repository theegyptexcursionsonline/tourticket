import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';
import ShowcaseV2ClientPage from './ShowcaseV2ClientPage';
import { ITour } from '@/lib/models/Tour';

export const revalidate = 60; // ISR: revalidate every 60 seconds

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  await dbConnect();
  const tour = await Tour.findOne({ slug }).lean();

  if (!tour) {
    return { title: 'Tour Not Found' };
  }

  return {
    title: `${tour.title} | Book Online | Egypt Excursions Online`,
    description: `Book ${tour.title} online. Real-time availability and instant confirmation.`,
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ShowcaseV2TourPage({ params }: PageProps) {
  const { slug } = await params;
  await dbConnect();

  const tour = await Tour.findOne({ slug })
    .populate('destination', 'name slug')
    .populate('category', 'name slug')
    .lean();

  if (!tour) {
    notFound();
  }

  const reviews = await Review.find({ tour: tour._id, isApproved: true })
    .populate('user', 'firstName lastName avatar')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Fetch related tours from same category
  let relatedTours: any[] = [];
  const categoryIds = Array.isArray(tour.category)
    ? tour.category.map((cat: any) => typeof cat === 'object' ? cat._id?.toString() : cat?.toString()).filter(Boolean)
    : tour.category ? [typeof tour.category === 'object' ? (tour.category as any)._id?.toString() : (tour.category as any)?.toString()].filter(Boolean) : [];

  if (categoryIds.length > 0) {
    relatedTours = await Tour.find({
      category: { $in: categoryIds },
      _id: { $ne: tour._id },
      isPublished: true
    })
      .populate('destination', 'name')
      .limit(3)
      .lean();
  }

  // Widget configuration from environment
  const widgetConfig = {
    orgId: process.env.NEXT_PUBLIC_FOXES_ORG_ID || '',
    productId: process.env.NEXT_PUBLIC_FOXES_PRODUCT_ID || '',
    apiUrl: process.env.NEXT_PUBLIC_FOXES_API_URL || 'https://foxesapp.netlify.app',
  };

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        <ShowcaseV2ClientPage
          tour={JSON.parse(JSON.stringify(tour))}
          reviews={JSON.parse(JSON.stringify(reviews))}
          relatedTours={JSON.parse(JSON.stringify(relatedTours))}
          widgetConfig={widgetConfig}
        />
      </main>
      <Footer />
    </>
  );
}
