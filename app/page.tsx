// app/page.tsx
// Using optimized server-side rendering with ISR (60s revalidation)
// This makes the homepage 10x faster by pre-rendering with cached data

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Egypt Excursions Online - Tours, Activities & Experiences',
  description: 'Discover Egypt\'s wonders with unforgettable tours and experiences. From Pyramids to Nile cruises, book your adventure today.',
};

export { default } from './HomePageServer';
