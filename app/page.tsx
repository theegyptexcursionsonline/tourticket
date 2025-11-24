// app/page.tsx
// Using ISR (Incremental Static Regeneration) with 60-second revalidation
// Benefits: Lightning-fast page loads + Fresh content every 60 seconds
// The page is statically generated and cached, then revalidated in the background

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Egypt Excursions Online - Tours, Activities & Experiences',
  description: 'Discover Egypt\'s wonders with unforgettable tours and experiences. From Pyramids to Nile cruises, book your adventure today.',
};

// Ensure Next.js picks up the ISR config for the homepage route.
export const revalidate = 60;

export { default } from './HomePageServer';
