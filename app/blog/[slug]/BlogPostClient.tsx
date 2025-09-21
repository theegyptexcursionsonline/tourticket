'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  Tag,
  Eye,
  Heart,
  Share2,
  Facebook,
  Twitter,
  Copy,
  ChevronLeft,
  ArrowRight,
  Phone,
  MapPin,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';

type IBlog = any;
type ITour = any;
type IDestination = any;

interface Props {
  blog: IBlog;
  relatedPosts: IBlog[];
}

/**
 * BlogPostClient.tsx
 * Improved, travel-focused sidebar and structured layout for tour/travel site.
 *
 * Notes:
 * - Ensure blog.content is sanitized server-side (we render with dangerouslySetInnerHTML).
 * - Ensure next.config.js allows external image domains used by featuredImage / destinations / tours.
 */

function formatDate(date?: string | Date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ReadTimeText(blog: IBlog) {
  if (blog.readTimeText) return blog.readTimeText;
  if (blog.readTime) return `${blog.readTime} min read`;
  return '5 min read';
}

/* ---------- Share & Like (kept lightweight) ---------- */
function ShareAndLike({ blog }: { blog: IBlog }) {
  const [open, setOpen] = useState(false);
  const [likes, setLikes] = useState(blog?.likes ?? 0);
  const [liked, setLiked] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setUrl(window.location.href);
  }, []);

  const handleShare = (type: 'facebook' | 'twitter' | 'copy') => {
    if (!url) return;
    if (type === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
    } else if (type === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(blog.title)}`, '_blank', 'noopener');
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard'));
    }
    setOpen(false);
  };

  const handleLike = async () => {
    if (liked) return;
    try {
      await fetch(`/api/blog/${blog.slug}/like`, { method: 'POST' });
      setLikes((s) => s + 1);
      setLiked(true);
      toast.success('Thanks for liking!');
    } catch {
      toast.error('Unable to like right now');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleLike}
        aria-pressed={liked}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
          liked ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700 hover:bg-red-50'
        }`}
      >
        <Heart className="h-4 w-4" />
        <span>{likes}</span>
      </button>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-100 hover:bg-indigo-50 transition"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>

        {open && (
          <div className="absolute right-0 z-40 mt-2 w-44 bg-white border rounded-lg shadow-lg p-2">
            <button onClick={() => handleShare('facebook')} className="w-full text-left px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" /> Facebook
            </button>
            <button onClick={() => handleShare('twitter')} className="w-full text-left px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Twitter className="h-4 w-4 text-sky-500" /> Twitter
            </button>
            <button onClick={() => handleShare('copy')} className="w-full text-left px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Copy className="h-4 w-4" /> Copy link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small Tour Card used in sidebar CTA ---------- */
function MiniTourCard({ tour }: { tour: ITour }) {
  return (
    <Link href={tour?.slug ? `/tour/${tour.slug}` : '#'} className="flex gap-3 items-center p-3 rounded-lg border hover:shadow-md transition bg-white">
      <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
        {tour?.image ? (
          <Image src={tour.image} alt={tour.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-100" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-900 line-clamp-2">{tour?.title}</div>
        <div className="text-xs text-slate-500 mt-1">{tour?.duration || 'Half day'}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm font-medium text-indigo-600">{tour?.discountPrice ? `$${tour.discountPrice}` : tour?.price ? `$${tour.price}` : 'From $49'}</div>
          <div className="text-xs text-slate-500">per person</div>
        </div>
      </div>
    </Link>
  );
}

/* ---------- Structured Sidebar component (travel-focused) ---------- */
function Sidebar({ blog }: { blog: IBlog }) {
  // prepare lists from blog.relatedTours / relatedDestinations
  const relatedTours: ITour[] = blog.relatedTours || [];
  const relatedDestinations: IDestination[] = blog.relatedDestinations || [];
  const popularDestinations: IDestination[] = blog.popularDestinations || relatedDestinations.slice(0, 4);

  return (
    <aside className="lg:col-span-1">
      <div className="space-y-6 sticky top-6">
        {/* Book a tour CTA */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h4 className="text-lg font-bold mb-3">Book a Tour</h4>
          <p className="text-sm text-slate-600 mb-4">Want to experience this? Book one of our recommended tours below, or contact our travel team to build a custom itinerary.</p>

          {relatedTours.length > 0 ? (
            <div className="space-y-3 mb-4">
              {relatedTours.slice(0, 2).map((t) => <MiniTourCard key={t._id || t.slug} tour={t} />)}
            </div>
          ) : (
            <div className="text-sm text-slate-500 mb-4">No direct tours linked — browse all tours <Link href="/tours" className="text-indigo-600 font-medium">here</Link>.</div>
          )}

          <Link href="/contact" className="block text-center w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
            Contact Travel Team
          </Link>

          <div className="mt-3 text-xs text-slate-500">Need urgent help? <a className="text-indigo-600" href="tel:+912345678900"><Phone className="inline h-3 w-3 mr-1" /> +91 234 567 8900</a></div>
        </div>

        {/* Quick Booking Widget (simulate) */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h4 className="font-semibold mb-3">Quick Book</h4>
          <form className="space-y-3">
            <div>
              <label className="text-xs text-slate-600">Destination</label>
              <select className="w-full mt-1 px-3 py-2 rounded border bg-white text-sm">
                <option>{blog.relatedDestinations?.[0]?.name || 'Cairo'}</option>
                <option>Luxor</option>
                <option>Aswan</option>
                <option>Hurghada</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="px-3 py-2 rounded border text-sm" />
              <select className="px-3 py-2 rounded border text-sm">
                <option>1 pax</option>
                <option>2 pax</option>
                <option>3 pax</option>
              </select>
            </div>
            <button type="button" className="w-full px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition">Check Availability</button>
          </form>
        </div>

        {/* Popular Destinations */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h4 className="font-semibold mb-3">Popular Destinations</h4>
          <div className="grid grid-cols-2 gap-3">
            {popularDestinations.length ? popularDestinations.map((d: any) => (
              <Link key={d._id || d.slug} href={`/destinations/${d.slug}`} className="flex flex-col items-center gap-2 p-2 rounded hover:bg-slate-50 transition">
                <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-100">
                  {d.image ? <Image src={d.image} alt={d.name} width={300} height={200} className="object-cover" /> : <div className="w-full h-full bg-slate-100" />}
                </div>
                <div className="text-sm text-center font-medium text-slate-800">{d.name}</div>
              </Link>
            )) : (
              <div className="text-sm text-slate-500">No destinations available</div>
            )}
          </div>
        </div>

        {/* Travel Essentials */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h4 className="font-semibold mb-3">Travel Essentials</h4>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 text-indigo-500 mt-1" /> Passport & visa check</li>
            <li className="flex items-start gap-2"><Star className="h-4 w-4 text-indigo-500 mt-1" /> Comfortable walking shoes</li>
            <li className="flex items-start gap-2"><Clock className="h-4 w-4 text-indigo-500 mt-1" /> Plan mornings & evenings</li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <h4 className="font-semibold mb-2">Get Trip Ideas</h4>
          <p className="text-sm text-slate-600 mb-3">Subscribe for the best Egypt tours & insider tips.</p>
          <form onSubmit={(e) => { e.preventDefault(); toast.success('Subscribed'); }}>
            <input type="email" required placeholder="Your email" className="w-full px-3 py-2 rounded border mb-3 text-sm" />
            <button className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Subscribe</button>
          </form>
        </div>

      </div>
    </aside>
  );
}

/* ---------- Main component ---------- */
export default function BlogPostClient({ blog, relatedPosts }: Props) {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Back / breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
          <Link href="/blog" className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600">
            <ChevronLeft className="h-4 w-4" /> Back to articles
          </Link>
        </div>
      </div>

      {/* Hero */}
      <header className="relative h-96 md:h-[420px]">
        {blog.featuredImage ? (
          <Image src={blog.featuredImage} alt={blog.title} fill className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-emerald-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/10"></div>

        <div className="absolute left-0 right-0 bottom-0 p-6 md:p-12 container mx-auto max-w-4xl text-white">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-indigo-600/90 text-xs font-semibold">{blog.categoryDisplay || blog.category}</span>
            {blog.featured && <span className="px-3 py-1 rounded-full bg-yellow-500/90 text-xs font-semibold">Featured</span>}
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold leading-tight mb-4">{blog.title}</h1>

          <div className="flex items-center gap-4 text-sm text-slate-200">
            <div className="flex items-center gap-2"><User className="h-4 w-4" /> <span>{blog.author}</span></div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span>{formatDate(blog.publishedAt)}</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span>{ReadTimeText(blog)}</span></div>
            <div className="flex items-center gap-2"><Eye className="h-4 w-4" /> <span>{blog.views ?? 0} views</span></div>
          </div>
        </div>
      </header>

      {/* Content + Sidebar */}
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <article className="lg:col-span-3 space-y-6">
            {/* Excerpt & actions */}
            <div className="bg-white rounded-2xl shadow p-6 flex items-start justify-between gap-4">
              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-700 font-medium">{blog.excerpt}</p>
              </div>
              <div>
                <ShareAndLike blog={blog} />
              </div>
            </div>

            {/* Body */}
            <div className="bg-white rounded-2xl shadow p-6 prose prose-lg max-w-none">
              {/* IMPORTANT: sanitize server-side before saving */}
              <div dangerouslySetInnerHTML={{ __html: blog.content }} />
            </div>

            {/* Tags */}
            {Array.isArray(blog.tags) && blog.tags.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-indigo-600" /> Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((t: string) => (
                    <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className="px-3 py-1 bg-slate-100 rounded-full text-sm hover:bg-indigo-50">
                      #{t}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related posts (inline) */}
            {relatedPosts && relatedPosts.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold mb-4">Related Articles</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {relatedPosts.map((p) => (
                    <Link key={p._id} href={`/blog/${p.slug}`} className="block p-3 rounded-lg border hover:shadow-md transition bg-white">
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">{p.excerpt}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <Sidebar blog={blog} />
        </div>
      </main>
    </div>
  );
}
