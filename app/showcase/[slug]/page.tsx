import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';
import ShowcaseClientPage from './ShowcaseClientPage';
import { ITour } from '@/lib/models/Tour';

export const revalidate = 60; // ISR: revalidate every 60 seconds

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getTourBySlug(slug: string): Promise<{ tour: ITour; reviews: any[]; relatedTours: ITour[] } | null> {
  await dbConnect();
  const tour = await Tour.findOne({ slug })
    .populate('destination', 'name slug')
    .populate('category', 'name slug')
    .lean();

  if (!tour) {
    return null;
  }

  // Fetch reviews separately
  const reviews = await Review.find({ tour: tour._id })
    .populate('user', 'firstName lastName picture')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Fetch related tours from same category
  let relatedTours: any[] = [];
  const categoryIds = Array.isArray(tour.category)
    ? tour.category.map((cat: any) => typeof cat === 'object' ? cat._id?.toString() : cat?.toString()).filter(Boolean)
    : tour.category ? [typeof tour.category === 'object' ? (tour.category as any)._id?.toString() : tour.category?.toString()].filter(Boolean) : [];

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

  return {
    tour: JSON.parse(JSON.stringify(tour)),
    reviews: JSON.parse(JSON.stringify(reviews)),
    relatedTours: JSON.parse(JSON.stringify(relatedTours))
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getTourBySlug(slug);

  if (!result) {
    return {
      title: 'Tour Not Found',
    };
  }

  const { tour } = result;
  const destination = typeof tour.destination === 'object' ? (tour.destination as any) : null;

  return {
    title: `${tour.title} | Book Online | Egypt Excursions Online`,
    description: `Book your ${tour.title} experience online. ${tour.description?.slice(0, 150)}...`,
    openGraph: {
      title: tour.title,
      description: tour.description,
      images: tour.image ? [{ url: tour.image, alt: tour.title }] : [],
      type: 'website',
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ShowcasePage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getTourBySlug(slug);

  if (!result) {
    notFound();
  }

  const { tour, reviews, relatedTours } = result;

  // Widget configuration - can be customized via environment variables
  const widgetConfig = {
    orgId: process.env.NEXT_PUBLIC_FOXES_ORG_ID || '697f988b5a33570cdc5f2e9c',
    productId: process.env.NEXT_PUBLIC_FOXES_PRODUCT_ID || '',
    apiUrl: process.env.NEXT_PUBLIC_FOXES_API_URL || 'http://localhost:3001',
  };

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
        <ShowcaseClientPage
          tour={tour}
          reviews={reviews}
          relatedTours={relatedTours}
          widgetConfig={widgetConfig}
        />
      </main>
      <Footer />
    </>
  );
}
