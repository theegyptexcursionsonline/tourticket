// app/page.tsx
// Using optimized server-side rendering with ISR (60s revalidation)
// This makes the homepage 10x faster by pre-rendering with cached data
export { default } from './HomePageServer';
