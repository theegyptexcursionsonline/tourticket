import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InterestLandingPage from '@/components/InterestLandingPage';

interface InterestPageProps {
  params: { slug: string };
}

async function getInterestData(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/interests/${slug}`,
      {
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching interest data:', error);
    return null;
  }
}

export async function generateMetadata({ params }: InterestPageProps): Promise<Metadata> {
  const interest = await getInterestData(params.slug);

  if (!interest) {
    return {
      title: 'Interest Not Found',
      description: 'The requested interest could not be found.',
    };
  }

  return {
    title: `${interest.name} Tours in Egypt | Egypt Excursions Online`,
    description: `Discover the best ${interest.name.toLowerCase()} tours and experiences in Egypt. Book your perfect adventure today!`,
    keywords: [interest.name, 'tours', 'Egypt', 'travel', 'excursions'].join(', '),
    openGraph: {
      title: `${interest.name} Tours in Egypt`,
      description: `Discover the best ${interest.name.toLowerCase()} tours and experiences in Egypt.`,
      type: 'website',
    },
    alternates: {
      canonical: `/interests/${params.slug}`,
    },
  };
}

export default async function InterestPage({ params }: InterestPageProps) {
  const interest = await getInterestData(params.slug);

  if (!interest) {
    notFound();
  }

  return (
    <>
      <Header />
      <InterestLandingPage interest={interest} />
      <Footer />
    </>
  );
}