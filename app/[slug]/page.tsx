import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TourDetailClientPage from './TourDetailClientPage';
import { ITour } from '@/lib/models/Tour';

interface PageProps {
  params: { slug: string };
}

// Server-side function to fetch single tour with populated data
async function getTourBySlug(slug: string): Promise<ITour | null> {
  await dbConnect();
  
const tour = await Tour.findOne({ slug })
    .populate('destination', 'name slug')
    .populate('category', 'name slug')
    .populate('reviews')
    .lean();
  
  if (!tour) {
    return null;
  }
  
  // Serialize the data to pass to the client component
  return JSON.parse(JSON.stringify(tour));
}

// Server-side function to fetch related tours
async function getRelatedTours(categoryId: string, currentTourId: string): Promise<ITour[]> {
  await dbConnect();
  
  const relatedTours = await Tour.find({
    category: categoryId,
    _id: { $ne: currentTourId },
    isPublished: true
  })
    .populate('destination', 'name')
    .populate('category', 'name')
    .limit(3)
    .lean();
  
  return JSON.parse(JSON.stringify(relatedTours));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tour = await getTourBySlug(params.slug);

  if (!tour) {
    return {
      title: 'Tour Not Found',
    };
  }

  const destination = typeof tour.destination === 'object' ? tour.destination : null;

  return {
    title: tour.metaTitle || `${tour.title} | ${destination?.name || 'Travel'} Tours`,
    description: tour.metaDescription || tour.description,
    keywords: tour.keywords || [tour.title, destination?.name].filter(Boolean),
    openGraph: {
      title: tour.title,
      description: tour.description,
      images: tour.image ? [{ url: tour.image, alt: tour.title }] : [],
      type: 'website',
    },
  };
}

// The main server component for the /[slug] route
export default async function TourDetailPage({ params }: PageProps) {
  const tour = await getTourBySlug(params.slug);

  if (!tour) {
    notFound();
  }

  // Get related tours
  const relatedTours = await getRelatedTours(tour.category as string, tour._id);

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <TourDetailClientPage tour={tour} relatedTours={relatedTours} />
      </main>
      <Footer />
    </>
  );
}

// Generate static paths for better performance
export async function generateStaticParams() {
  try {
    await dbConnect();
    const tours = await Tour.find({ isPublished: true }).select('slug').lean();
    return tours.map((tour) => ({ slug: tour.slug }));
  } catch (error) {
    return [];
  }
}