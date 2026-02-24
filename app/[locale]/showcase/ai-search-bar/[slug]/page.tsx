import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Review from '@/lib/models/Review';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';
import SearchBarShowcaseClient from './SearchBarShowcaseClient';
import { ITour } from '@/lib/models/Tour';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getTourBySlug(slug: string): Promise<{ tour: ITour; reviews: any[] } | null> {
  await dbConnect();
  const tour = await Tour.findOne({ slug }).populate('destination', 'name slug').populate('category', 'name slug').lean();
  if (!tour) return null;
  const reviews = await Review.find({ tour: tour._id }).populate('user', 'firstName lastName picture').sort({ createdAt: -1 }).limit(5).lean();
  return { tour: JSON.parse(JSON.stringify(tour)), reviews: JSON.parse(JSON.stringify(reviews)) };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getTourBySlug(slug);
  if (!result) return { title: 'Tour Not Found' };
  return {
    title: `${result.tour.title} | Egypt Excursions Online`,
    description: `Search and explore ${result.tour.title}. Get instant answers and recommendations.`,
    openGraph: { title: result.tour.title, description: result.tour.description, images: result.tour.image ? [{ url: result.tour.image, alt: result.tour.title }] : [] },
  };
}

export async function generateStaticParams() { return []; }

export default async function SearchBarShowcasePage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getTourBySlug(slug);
  if (!result) notFound();
  const { tour, reviews } = result;
  const widgetConfig = {
    apiUrl: process.env.NEXT_PUBLIC_FOXES_SEARCH_API_URL || 'https://search.foxestechnology.com',
    apiKey: process.env.NEXT_PUBLIC_FOXES_SEARCH_API_KEY || '',
  };

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-cyan-50 to-white">
        <SearchBarShowcaseClient tour={tour} reviews={reviews} widgetConfig={widgetConfig} />
      </main>
      <Footer />
    </>
  );
}
