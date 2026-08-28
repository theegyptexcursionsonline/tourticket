// app/egypt/page.tsx
import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CheckCircle } from 'lucide-react';
import { Tour, Category } from '@/types';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import AttractionPageModel from '@/lib/models/AttractionPage';
import EgyptHeroClient from './EgyptHeroClient';
import EgyptToursClient from './EgyptToursClient';
import { attractionPagePath, contentPath } from '@/lib/content/contentUrl';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import type { Metadata } from 'next';
import { englishOnlyMetadataAlternates } from '@/lib/i18n/seoAlternates';

interface EgyptAttractionSummary {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  heroImage?: string;
  urlType?: string;
  parentPage?: { slug?: string } | null;
  featured?: boolean;
}

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await params;
  const title = 'Egypt Tours & Experiences | Egypt Excursions Online';
  const description = 'Explore tours, attractions, and travel experiences across Egypt.';
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    alternates: englishOnlyMetadataAlternates('/egypt'),
  };
}

/* ---------- Page Data ---------- */
const FEATURES = [
  'Sunset Nile cruises & private felucca rides',
  'Guided pyramid tours with expert Egyptologists',
  'Authentic cultural experiences & local cuisine',
  'Luxury & boutique accommodation options',
  'Private photography sessions at sunrise',
  'VIP concierge & customizable itineraries'
];

const GALLERY = [
  { src: '/pyramid.png', alt: 'Pyramids at sunrise' },
  { src: '/pyramid3.png', alt: 'Traditional felucca on the Nile' },
  { src: '/pyramid2.png', alt: 'Temple silhouette at twilight' },
  { src: '/image.png', alt: 'Local market and cultural scene' }
];

const FAQS = [
  { q: 'How long are the experiences?', a: 'Typical experiences are 1–3 days depending on the package; custom itineraries can be arranged.' },
  { q: 'Are pickups included?', a: 'Some plans include transfers — check the package details or contact our concierge for tailored transport.' },
  { q: 'Is this family friendly?', a: 'Yes — we offer family-friendly packages with activities suitable for children and seniors.' }
];

/* ---------- Server-side Data Fetching ---------- */
async function fetchTours(): Promise<Tour[]> {
  try {
    await dbConnect();

    const tours = await TourModel.find({ isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()
      .exec();

    // Convert MongoDB documents to plain objects
    return JSON.parse(JSON.stringify(tours));
  } catch (error) {
    console.error('Failed to fetch tours:', error);
    return [];
  }
}

async function fetchCategories(): Promise<Category[]> {
  try {
    await dbConnect();

    const categories = await CategoryModel.find({
      isPublished: true,
      archivedAt: null,
      ...DEFAULT_TENANT_FILTER,
    })
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();

    const categoryCounts = await TourModel.aggregate<{ _id: unknown; tourCount: number }>([
      { $match: { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER } },
      { $unwind: '$category' },
      { $group: { _id: '$category', tourCount: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(categoryCounts.map((row) => [String(row._id), row.tourCount]));
    const categoriesWithCounts = categories.map((category) => ({
      ...category,
      tourCount: countByCategory.get(String(category._id)) || 0,
    }));

    const serializedCategories = JSON.parse(JSON.stringify(categoriesWithCounts)) as (Category & { tourCount: number })[];

    // Filter published categories with tours
    const publishedCategories = serializedCategories.filter(
      (category) => category.isPublished !== false && category.tourCount > 0 && Boolean(category.heroImage)
    );

    // Convert MongoDB documents to plain objects
    return publishedCategories.slice(0, 8);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

async function fetchAttractions(): Promise<EgyptAttractionSummary[]> {
  try {
    await dbConnect();
    const pages = await AttractionPageModel.find({
      isPublished: true,
      pageType: 'attraction',
      archivedAt: null,
      ...DEFAULT_TENANT_FILTER,
    })
      .select('_id title slug description heroImage urlType parentPage featured')
      .sort({ featured: -1, updatedAt: -1, title: 1 })
      .limit(24)
      .lean();

    return (JSON.parse(JSON.stringify(pages)) as EgyptAttractionSummary[])
      .filter((page) => Boolean(page.heroImage))
      .slice(0, 8);
  } catch (error) {
    console.error('Failed to fetch attraction pages:', error);
    return [];
  }
}

/* ---------- Server Component (Main Page) ---------- */
export default async function AboutEgyptLanding() {
  // Fetch data in parallel on the server
  const [tours, categories, attractions] = await Promise.all([
    fetchTours(),
    fetchCategories(),
    fetchAttractions(),
  ]);

  return (
    <>
      <Header />

      <main className="bg-white text-gray-800">
        {/* Hero - Client Component for interactivity */}
        <EgyptHeroClient />

        {/* Vision */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Vision</h2>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                We craft travel experiences that combine the grandeur of Egypt&apos;s ancient wonders with modern comforts and curated local encounters.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                From private Nile cruises to exclusive after-hours temple access, our team builds tailored journeys that become lifelong memories.
              </p>
            </div>

            <div className="w-full h-80 relative rounded-2xl overflow-hidden shadow-xl">
              <Image src="/pyramid2.jpg" alt="Pyramids of Giza" fill className="object-cover" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What to Expect</h2>
              <p className="text-lg text-gray-600">Experiences designed for curious travelers and discerning guests.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-md"
                >
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle className="h-7 w-7 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-800">{f}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Step Inside</h2>
              <p className="text-gray-600">Moments from curated experiences — sunrise, sunset and in-between.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GALLERY.map((img, idx) => (
                <div
                  key={idx}
                  className="w-full h-64 relative rounded-xl overflow-hidden shadow-lg"
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore by Category</h2>
              <p className="text-gray-600 text-lg">Find the perfect experience tailored to your interests.</p>
            </div>

            {categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    href={contentPath('category', category.slug, category.urlType, null, category.parentPage?.slug)}
                    className="group relative min-h-64 overflow-hidden rounded-2xl border border-gray-100 bg-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <Image
                      src={category.heroImage || '/placeholder-category.jpg'}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="text-xl font-bold text-white transition-colors group-hover:text-amber-300">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-slate-200">
                        {category.tourCount || 0} {category.tourCount === 1 ? 'tour' : 'tours'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No categories available at the moment.</p>
              </div>
            )}
          </div>
        </section>

        {attractions.length > 0 ? (
          <section className="bg-white py-20">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mb-12 text-center">
                <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Discover Top Attractions</h2>
                <p className="mt-4 text-lg text-gray-600">Explore Egypt&apos;s landmark cities, coastlines, and cultural highlights.</p>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {attractions.map((attraction) => (
                  <Link
                    key={attraction._id}
                    href={attractionPagePath(attraction.slug, 'attraction', attraction.urlType, null, attraction.parentPage?.slug)}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative h-44 bg-slate-200">
                      <Image
                        src={attraction.heroImage || '/placeholder-category.jpg'}
                        alt={attraction.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700">{attraction.title}</h3>
                      {attraction.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{attraction.description}</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Tour Listings Section */}
        <section id="tours" className="scroll-mt-24 bg-white py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Tours & Experiences</h2>
              <p className="text-gray-600 text-lg">Discover authentic Egyptian experiences curated for you.</p>
            </div>

            {/* Client Component for Tours with Booking Interaction */}
            <EgyptToursClient tours={tours} />
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">FAQ</h2>
              <p className="text-gray-600">Common questions answered</p>
            </div>

            <div className="space-y-4">
              {FAQS.map((f, i) => (
                <details key={i} className="bg-white rounded-xl p-5 shadow-md">
                  <summary className="cursor-pointer text-lg font-medium text-gray-800 list-none">
                    {f.q}
                  </summary>
                  <div className="mt-3 text-gray-600">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20" style={{ backgroundColor: '#2147F3' }}>
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight sm:text-4xl text-amber-300 mb-4">
              Ready for a Timeless Adventure?
            </h2>
            <p className="text-amber-100 mb-8">
              Book now to secure your dates. Our team will tailor an experience to your wishes.
            </p>
            <div>
              <Link
                href="/experience/egypt-booking"
                className="inline-block font-bold py-4 px-10 rounded-full text-lg hover:opacity-95 transform hover:scale-105 transition-all duration-300 ease-in-out shadow-xl"
                style={{ color: '#2147F3', backgroundColor: '#FFED4F' }}
              >
                Book Your Experience
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
