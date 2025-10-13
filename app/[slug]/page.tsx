import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';
import TourDetailClientPage from './TourDetailClientPage';
import { ITour } from '@/lib/models/Tour';

interface PageProps {
  params: { slug: string };
}

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

  return JSON.parse(JSON.stringify(tour));
}

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

export default async function TourDetailPage({ params }: PageProps) {
  const tour = await getTourBySlug(params.slug);

  if (!tour) {
    notFound();
  }

  const relatedTours = await getRelatedTours(tour.category as string, tour._id);

  return (
    <>
      <Header2 startSolid />
      <TourDetailClientPage
        tour={tour}
        relatedTours={relatedTours}
        initialReviews={tour.reviews || []}
      />
      <Footer />
    </>
  );
}

export async function generateStaticParams() {
  try {
    await dbConnect();
    const tours = await Tour.find({ isPublished: true }).select('slug').lean();
    return tours.map((tour) => ({ slug: tour.slug }));
  } catch {
    return [];
  }
}