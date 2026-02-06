import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import ShowcaseV2ClientPage from './ShowcaseV2ClientPage';

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

  // Widget configuration from environment
  const widgetConfig = {
    orgId: process.env.NEXT_PUBLIC_FOXES_ORG_ID || '',
    productId: process.env.NEXT_PUBLIC_FOXES_PRODUCT_ID || '',
    apiUrl: process.env.NEXT_PUBLIC_FOXES_API_URL || 'https://foxesapp.netlify.app',
  };

  return (
    <ShowcaseV2ClientPage
      tour={JSON.parse(JSON.stringify(tour))}
      reviews={JSON.parse(JSON.stringify(reviews))}
      widgetConfig={widgetConfig}
    />
  );
}
