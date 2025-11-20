// app/tours/page.tsx
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AISearchWidget from '@/components/AISearchWidget';
import ToursClientPage from './ToursClientPage';
import { ITour } from '@/lib/models/Tour';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'All Tours & Activities | Egypt Excursions Online',
  description: 'Browse our complete collection of tours and experiences in Egypt. Find the perfect adventure for your trip.',
  openGraph: {
    title: 'All Tours & Activities | Egypt Excursions Online',
    description: 'Browse our complete collection of tours and experiences in Egypt.',
    type: 'website',
  },
};

// Server-side function to fetch all tours with populated data
async function getAllTours(): Promise<ITour[]> {
  await dbConnect();
  
  const tours = await Tour.find({ isPublished: true })
    .populate('destination', 'name')
    .populate('category', 'name')
    .sort({ featured: -1, createdAt: -1 }) // Featured first, then most recent
    .lean();
  
  // Serialize the data to pass to the client component
  return JSON.parse(JSON.stringify(tours));
}

// The main server component for the /tours route
export default async function ToursIndexPage() {
  const tours = await getAllTours();

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <ToursClientPage tours={tours} />
      </main>
      <Footer />
      {/* AI Search Widget */}
      <AISearchWidget />
    </>
  );
}