'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { getAuthorRouteSlug } from '@/lib/blogAuthors';
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
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { sanitizeRichHtml } from '@/lib/security/sanitizeHtml';
import { imageMetadataFor, type ImageMetadata } from '@/lib/content/imageMetadata';
import { tourContentPath } from '@/lib/content/contentUrl';
import type { Destination } from '@/types';
import { AuthorCard, type AuthorProfile } from './AuthorCard';
import { BlogNewsletterForm } from './BlogNewsletterForm';
import { blogCategoryLabel, blogReadMinutes, countValues, tourDisplayPrice } from '@/lib/blog/blogDisplay';


export interface TourPreview {
  _id?: string;
  slug: string;
  title: string;
  urlType?: string;
  destination?: { slug?: string } | string;
  parentPage?: { slug?: string } | null;
  image?: string;
  images?: string[];
  duration?: string;
  discountPrice?: number;
  price?: number;
}

export interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  imageMetadata?: ImageMetadata[];
  metaDescription?: string;
  updatedAt?: string | Date;
  category?: string;
  categoryDisplay?: string;
  featured?: boolean;
  publishedAt?: string | Date;
  /** The publish date as the page prints it, formatted on the server for the page language. */
  publishedDateText?: string;
  readTime?: number;
  views?: number;
  likes?: number;
  tags?: string[];
  relatedTours?: TourPreview[];
  relatedDestinations?: Destination[];
  author: string;
  authorSlug?: string;
  authorRole?: string;
  authorBio?: string;
  authorAvatar?: string;
  authorTwitter?: string;
  authorFacebook?: string;
  authorWebsite?: string;
  authorPostsCount?: number;
  authorObject?: AuthorProfile;
}

interface Props {
  blog: BlogPost;
  relatedPosts: BlogPost[];
  relevantTours?: TourPreview[];
}

/**
 * BlogPostClient.tsx
 * Full file including the post body, author card, and related content.
 *
 * NOTES:
 * - Keep server-side sanitization for blog.content.
 * - Ensure next.config.js includes allowed image domains for featuredImage / avatars.
 */

/** "5 min read" in the page language, or nothing when the post has no stored read time. */
function useReadTimeText(blog: BlogPost): string | null {
  const t = useTranslations('blog');
  const minutes = blogReadMinutes(blog.readTime);
  return minutes === null ? null : t('readTime', countValues(minutes));
}

/* ---------- Share & Like (kept lightweight) ---------- */
function ShareAndLike({ blog }: { blog: BlogPost }) {
  const t = useTranslations('blog.article');
  const [open, setOpen] = useState(false);
  const [likes, setLikes] = useState(blog?.likes ?? 0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/blog/${encodeURIComponent(blog.slug)}/like`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!result) return;
        setLiked(Boolean(result.liked));
        if (Number.isFinite(result.likes)) setLikes(result.likes);
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') console.warn('Unable to load blog like status.');
      });
    return () => controller.abort();
  }, [blog.slug]);

  const handleShare = (type: 'facebook' | 'twitter' | 'copy') => {
    const url = window.location.href;
    if (type === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
    } else if (type === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(blog.title)}`, '_blank', 'noopener');
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success(t('linkCopied')));
    }
    setOpen(false);
  };

  const handleLike = async () => {
    if (liked || isLiking) return;
    setIsLiking(true);
    try {
      const response = await fetch(`/api/blog/${encodeURIComponent(blog.slug)}/like`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      // The route answers in English; the reader is told in the page language.
      if (!response.ok) {
        toast.error(response.status === 429 ? t('likeTooMany') : t('likeError'));
        return;
      }
      if (Number.isFinite(result.likes)) setLikes(result.likes);
      setLiked(true);
      toast.success(result.replayed === true ? t('likeReplayed') : t('likeThanks'));
    } catch {
      toast.error(t('likeError'));
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleLike}
        aria-pressed={liked}
        aria-label={t(liked ? 'likedLabel' : 'likeLabel', { n: String(likes) })}
        disabled={liked || isLiking}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
          liked ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700 hover:bg-red-50'
        } disabled:cursor-default disabled:opacity-80`}
      >
        <Heart className="h-4 w-4" />
        <span>{likes}</span>
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-100 hover:bg-amber-50 transition"
        >
          <Share2 className="h-4 w-4" />
          <span>{t('share')}</span>
        </button>

        {open && (
          <div className="blog-card absolute start-0 z-40 mt-2 w-44 bg-white border rounded-lg shadow-lg p-2 md:start-auto md:end-0">
            <button onClick={() => handleShare('facebook')} className="w-full min-h-11 text-start px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" /> {t('shareFacebook')}
            </button>
            <button onClick={() => handleShare('twitter')} className="w-full min-h-11 text-start px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Twitter className="h-4 w-4 text-sky-500" /> {t('shareTwitter')}
            </button>
            <button onClick={() => handleShare('copy')} className="w-full min-h-11 text-start px-2 py-2 rounded hover:bg-slate-50 flex items-center gap-2">
              <Copy className="h-4 w-4" /> {t('copyLink')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small Tour Card used in sidebar CTA ---------- */
function MiniTourCard({ tour }: { tour: TourPreview }) {
  const t = useTranslations('blog.article');
  // Only what the tour really carries: no stand-in length and no stand-in price.
  const price = tourDisplayPrice(tour);
  return (
    <Link href={tour?.slug ? tourContentPath(tour) : '#'} className="blog-card flex gap-3 items-center p-3 rounded-lg border hover:shadow-md transition bg-white">
      <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
        {tour?.image ? (
          <Image src={tour.image} alt={tour.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-100" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-900 line-clamp-2">{tour?.title}</div>
        {tour?.duration ? <div className="text-xs text-slate-500 mt-1">{tour.duration}</div> : null}
        {price !== null ? (
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm font-medium text-amber-600">${price}</div>
            <div className="text-xs text-slate-500">{t('perPerson')}</div>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

/* ---------- Structured Sidebar component (travel-focused) ---------- */
function Sidebar({ blog }: { blog: BlogPost }) {
  const t = useTranslations('blog.sidebar');
  // prepare lists from blog.relatedTours
  const relatedTours = blog.relatedTours || [];

  return (
    <aside className="lg:col-span-1">
      <div className="space-y-6 sticky top-6">
        {/* Book a tour CTA */}
        <div className="blog-card bg-white rounded-2xl shadow p-6">
          <h4 className="text-lg font-bold mb-3">{t('bookTitle')}</h4>
          <p className="text-sm text-slate-600 mb-4">{t('bookBody')}</p>

          {relatedTours.length > 0 ? (
            <div className="space-y-3 mb-4">
              {relatedTours.slice(0, 2).map((t) => <MiniTourCard key={t._id || t.slug} tour={t} />)}
            </div>
          ) : (
            <div className="text-sm text-slate-500 mb-4">
              {t.rich('noTours', {
                link: (chunks) => <Link href="/tours" className="text-amber-600 font-medium">{chunks}</Link>,
              })}
            </div>
          )}

          <Link href="/tours" className="block text-center w-full px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition">
            {t('browseAll')}
          </Link>

          <div className="mt-3 text-xs text-slate-500">{t('urgentHelp')} <a className="text-amber-600" href="tel:+201142255624"><Phone className="inline h-3 w-3 me-1" /> <bdi dir="ltr" className="whitespace-nowrap">+20 11 42255624</bdi></a></div>
        </div>

        {/* Travel Essentials */}
        <div className="blog-card bg-white rounded-2xl shadow p-6">
          <h4 className="font-semibold mb-3">{t('essentialsTitle')}</h4>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 text-amber-500 mt-1" /> {t('essentialPassport')}</li>
            <li className="flex items-start gap-2"><Star className="h-4 w-4 text-amber-500 mt-1" /> {t('essentialShoes')}</li>
            <li className="flex items-start gap-2"><Clock className="h-4 w-4 text-amber-500 mt-1" /> {t('essentialPlan')}</li>
          </ul>
        </div>

        {/* Newsletter: a real request to the subscribe route of the site, never a stand-in success */}
        <BlogNewsletterForm />

      </div>
    </aside>
  );
}

/* ---------- Reading progress bar ---------- */
function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent" aria-hidden>
      <div className="h-full bg-amber-600 transition-[width] duration-150 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------- Main component ---------- */
export default function BlogPostClient({ blog, relatedPosts, relevantTours = [] }: Props) {
  const t = useTranslations('blog');
  const readTimeText = useReadTimeText(blog);
  const categoryLabel = blogCategoryLabel(t, blog.category);
  const isPartnershipFeature = blog.slug === 'egypt-excursions-online-getyourguide-partnership';
  const authorSlug = getAuthorRouteSlug({
    slug: blog.authorSlug,
    name: blog.author,
  });

  return (
    <div className="blog-post-page bg-stone-50 min-h-screen">
      <ReadingProgress />

      {isPartnershipFeature ? (
        <header className="partnership-hero text-white">
          <div className="container mx-auto max-w-6xl px-4 pb-12 pt-7 md:pb-16 md:pt-10">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t('partnership.back')}
            </Link>

            <div className="mt-10 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="max-w-4xl">
                <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-200">
                  <span className="rounded-full bg-amber-400 px-3 py-1 font-semibold uppercase tracking-[0.12em] text-slate-950">
                    {t('partnership.badge')}
                  </span>
                  {readTimeText ? <span>{readTimeText}</span> : null}
                  {readTimeText && blog.publishedDateText ? <span aria-hidden>•</span> : null}
                  {blog.publishedDateText ? <span>{blog.publishedDateText}</span> : null}
                </div>
                <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-7xl">
                  {blog.title}
                </h1>
                {blog.excerpt ? (
                  <p className="mt-7 max-w-3xl text-lg leading-relaxed text-slate-200 md:text-xl">
                    {blog.excerpt}
                  </p>
                ) : null}
              </div>

              <div className="feature-share flex flex-col gap-4 lg:items-end">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <User className="h-4 w-4" />
                  {authorSlug ? (
                    <Link href={`/author/${authorSlug}`} className="font-semibold text-white hover:text-amber-300">
                      {blog.author}
                    </Link>
                  ) : <span className="font-semibold text-white">{blog.author}</span>}
                </div>
                <ShareAndLike blog={blog} />
              </div>
            </div>

            {blog.featuredImage ? (
              <div className="relative mt-12 aspect-[16/9] overflow-hidden rounded-[1.75rem] bg-slate-800 shadow-2xl ring-1 ring-white/10">
                <Image
                  src={blog.featuredImage}
                  alt={imageMetadataFor(blog.featuredImage, blog.imageMetadata, blog.title).alt}
                  title={imageMetadataFor(blog.featuredImage, blog.imageMetadata, blog.title).title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 1152px"
                />
              </div>
            ) : null}
          </div>
        </header>
      ) : (
        <>
          {/* Back / breadcrumb */}
          <div className="bg-white border-b border-stone-200">
            <div className="container mx-auto px-4 py-3">
              <Link href="/blog" className="inline-flex items-center gap-2 text-stone-600 hover:text-amber-700">
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t('article.back')}
              </Link>
            </div>
          </div>

          {/* Standard article hero */}
          <header className="relative h-[440px] md:h-[540px]">
            {blog.featuredImage ? (
              <Image
                src={blog.featuredImage}
                alt={imageMetadataFor(blog.featuredImage, blog.imageMetadata, blog.title).alt}
                title={imageMetadataFor(blog.featuredImage, blog.imageMetadata, blog.title).title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-700 to-stone-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10"></div>

            <div className="absolute left-0 right-0 bottom-0 p-6 md:p-12 container mx-auto max-w-4xl text-white">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {categoryLabel ? <span className="px-3 py-1 rounded-full bg-amber-600/95 text-xs font-semibold uppercase tracking-wide">{categoryLabel}</span> : null}
                {blog.featured && <span className="px-3 py-1 rounded-full bg-yellow-500/95 text-stone-900 text-xs font-semibold inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {t('featured')}</span>}
              </div>

              <h1 className="blog-serif text-3xl md:text-5xl font-bold leading-[1.12] mb-5 max-w-4xl">{blog.title}</h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {authorSlug ? (
                    <Link href={`/author/${authorSlug}`} className="hover:text-white">
                      {blog.author}
                    </Link>
                  ) : (
                    <span>{blog.author}</span>
                  )}
                </div>
                {blog.publishedDateText ? <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span>{blog.publishedDateText}</span></div> : null}
                {readTimeText ? <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span>{readTimeText}</span></div> : null}
                <div className="flex items-center gap-2"><Eye className="h-4 w-4" /> <span>{t('views', countValues(blog.views ?? 0))}</span></div>
              </div>
            </div>
          </header>
        </>
      )}

      {/* Content + Sidebar */}
      <main className={`container mx-auto px-4 ${isPartnershipFeature ? 'max-w-5xl py-16 md:py-24' : 'max-w-6xl py-12'}`}>
        <div className={isPartnershipFeature ? '' : 'grid grid-cols-1 lg:grid-cols-4 gap-8'}>
          <article className={isPartnershipFeature ? 'space-y-8' : 'lg:col-span-3 space-y-6'}>
            {/* Standfirst (lead) + actions */}
            {/* On a phone the standfirst takes the full width and the actions sit on their own
                row below it; the two share a row only from md up. */}
            {!isPartnershipFeature && <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
              {blog.excerpt ? (
                <p className="blog-standfirst blog-serif min-w-0 text-xl md:text-2xl leading-relaxed text-stone-600 border-s-4 border-amber-500 ps-5">
                  {blog.excerpt}
                </p>
              ) : null}
              <div className="md:ms-auto md:shrink-0 md:pt-1">
                <ShareAndLike blog={blog} />
              </div>
            </div>}

            {isPartnershipFeature ? (
              <div className="story-metrics" aria-label={t('partnership.highlightsLabel')}>
                <div><strong>2011</strong><span>{t('partnership.began')}</span></div>
                <div><strong>{t('partnership.yearsValue')}</strong><span>{t('partnership.growing')}</span></div>
                <div><strong>108%</strong><span>{t('partnership.growth')}</span></div>
              </div>
            ) : null}

            {/* Article body — editorial styles live in the global block below */}
            <div
              className={`blog-card blog-content ${isPartnershipFeature ? 'feature-article-body' : 'bg-white rounded-2xl shadow-sm ring-1 ring-stone-100 p-6 md:p-10'}`}
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(blog.content) }}
            />

            {/* Tags */}
            {Array.isArray(blog.tags) && blog.tags.length > 0 && (
              <div className="blog-card bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-amber-600" /> {t('article.tags')}</h3>
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag: string) => (
                    <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="px-3 py-1 bg-slate-100 rounded-full text-sm hover:bg-amber-50">
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Author */}
            <div className="blog-card bg-white rounded-2xl shadow p-6">
              <AuthorCard author={blog.authorObject ?? {
                name: blog.author || t('article.authorFallback'),
                role: blog.authorRole,
                bio: blog.authorBio,
                avatar: blog.authorAvatar,
                twitter: blog.authorTwitter,
                facebook: blog.authorFacebook,
                website: blog.authorWebsite,
                slug: blog.authorSlug,
                postsCount: blog.authorPostsCount
              }} />
            </div>

            {/* Tours you'll love — bookable tours relevant to this post */}
            {relevantTours && relevantTours.length > 0 && (
              <div className="blog-card bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-600" /> {t('article.toursHeading')}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relevantTours.slice(0, 6).map((tour) => {
                    const img = tour?.image || (Array.isArray(tour?.images) ? tour.images[0] : undefined);
                    // Length and price appear only when the tour carries them.
                    const price = tourDisplayPrice(tour);
                    return (
                      <Link key={tour._id || tour.slug} href={tourContentPath(tour)} className="blog-card group block rounded-xl border overflow-hidden hover:shadow-md transition bg-white">
                        <div className="relative h-32 bg-slate-100">
                          {img ? (
                            <Image src={img} alt={tour.title} fill className="object-cover transition group-hover:scale-105" />
                          ) : null}
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-semibold text-slate-900 line-clamp-2">{tour.title}</div>
                          {tour.duration || price !== null ? (
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-xs text-slate-500">{tour.duration || null}</span>
                              {price !== null ? <span className="text-sm font-semibold text-amber-600">${price}</span> : null}
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Link href="/tours" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800">
                  {t('article.browseAllTours')} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              </div>
            )}

            {/* Related posts — horizontal carousel */}
            {relatedPosts && relatedPosts.length > 0 && (
              <div className="blog-card bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold mb-4">{t('article.relatedHeading')}</h3>
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
                  {relatedPosts.map((p) => (
                    <Link key={p._id} href={`/blog/${p.slug}`} className="blog-card snap-start shrink-0 w-64 rounded-xl border overflow-hidden hover:shadow-md transition bg-white">
                      <div className="relative h-32 bg-slate-100">
                        {p.featuredImage ? (
                          <Image
                            src={p.featuredImage}
                            alt={imageMetadataFor(p.featuredImage, p.imageMetadata, p.title).alt}
                            title={imageMetadataFor(p.featuredImage, p.imageMetadata, p.title).title}
                            fill
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <div className="text-sm font-semibold line-clamp-2">{p.title}</div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">{p.excerpt}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          {!isPartnershipFeature ? <Sidebar blog={blog} /> : null}
        </div>
      </main>

      {/* Editorial styling for the rendered markdown — serif headings, a warm
          accent that harmonizes with the EEO brand, a drop cap, and a
          comfortable reading measure. */}
      <style jsx global>{`
        .blog-serif {
          font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
        }

        .partnership-hero {
          background:
            radial-gradient(circle at 85% 8%, rgba(245, 158, 11, 0.2), transparent 28rem),
            linear-gradient(145deg, #07152f 0%, #101b36 58%, #291609 100%);
        }
        .feature-share button {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          backdrop-filter: blur(10px);
        }
        .feature-share button:hover {
          background: rgba(255, 255, 255, 0.17);
        }
        .story-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          overflow: hidden;
          border: 1px solid #e7e5e4;
          border-radius: 1.25rem;
          background: #e7e5e4;
        }
        .story-metrics > div {
          display: flex;
          min-height: 8.5rem;
          flex-direction: column;
          justify-content: center;
          background: #fff;
          padding: 1.5rem;
        }
        .story-metrics strong {
          color: #0f172a;
          font-size: clamp(1.8rem, 4vw, 3rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .story-metrics span {
          margin-top: 0.55rem;
          color: #57534e;
          font-size: 0.84rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .feature-article-body {
          background: transparent;
          box-shadow: none;
          color: #292524;
          padding: 0 clamp(0rem, 5vw, 5rem);
        }
        .feature-article-body > h2:first-child {
          max-width: 24ch;
          border: 0;
          color: #0f172a;
          font-family: inherit;
          font-size: clamp(2rem, 5vw, 4rem);
          font-weight: 900;
          letter-spacing: -0.035em;
          line-height: 1.05;
          margin-top: 0.65em;
          padding: 0;
        }

        .blog-content {
          color: #292524; /* stone-800 */
          font-size: 1.125rem;
          line-height: 1.8;
        }
        /* comfortable reading measure for prose, full-width for media */
        .blog-content > p,
        .blog-content > ul,
        .blog-content > ol,
        .blog-content > h2,
        .blog-content > h3,
        .blog-content > h4,
        .blog-content > blockquote {
          max-width: 68ch;
        }

        .blog-content h2,
        .blog-content h3,
        .blog-content h4 {
          font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
          color: #1c1917; /* stone-900 */
          letter-spacing: -0.01em;
          scroll-margin-top: 5rem;
          text-wrap: balance;
          overflow-wrap: anywhere;
        }
        .blog-content h2 {
          font-size: 1.9rem;
          font-weight: 700;
          margin-top: 2.2em;
          margin-bottom: 0.7em;
          padding-bottom: 0.35em;
          border-bottom: 2px solid #f3e9d9; /* warm hairline */
        }
        .blog-content h3 {
          font-size: 1.45rem;
          font-weight: 700;
          margin-top: 1.7em;
          margin-bottom: 0.6em;
        }
        .blog-content h4 {
          font-size: 1.18rem;
          font-weight: 700;
          margin-top: 1.4em;
          margin-bottom: 0.5em;
        }
        .blog-content p {
          margin-top: 1.15em;
          margin-bottom: 1.15em;
        }
        /* Drop cap on the opening paragraph — editorial touch */
        .blog-content > p:first-of-type::first-letter {
          float: left;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 3.6em;
          line-height: 0.72;
          font-weight: 700;
          color: #b45309; /* amber-700 */
          padding: 0.06em 0.1em 0 0;
        }
        /* Arabic letters join: lifting the first one out of its word and
           floating it to the far side breaks the word, so a right-to-left
           article opens with plain text. */
        [dir="rtl"] .blog-content > p:first-of-type::first-letter {
          float: none;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          font-weight: inherit;
          color: inherit;
          padding: 0;
        }
        .blog-content a {
          color: #b45309; /* amber-700 */
          font-weight: 600;
          text-decoration: none;
          background-image: linear-gradient(#f5d5a8, #f5d5a8);
          background-size: 100% 1px;
          background-position: 0 1.15em;
          background-repeat: no-repeat;
          transition: color 0.15s ease, background-size 0.15s ease;
        }
        .blog-content a:hover {
          color: #92400e; /* amber-800 */
          background-size: 100% 2px;
        }
        .blog-content strong {
          color: #1c1917;
          font-weight: 700;
        }
        .blog-content blockquote {
          border-inline-start: 3px solid #d97706; /* amber-600 */
          background: #fdf7ee;
          padding: 0.9rem 1.25rem;
          border-start-start-radius: 0;
          border-end-start-radius: 0;
          border-start-end-radius: 0.5rem;
          border-end-end-radius: 0.5rem;
          margin: 1.8em 0;
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 1.18rem;
          color: #44403c; /* stone-700 */
        }
        .blog-content blockquote p {
          margin: 0;
        }
        .blog-content ul,
        .blog-content ol {
          margin-top: 1.1em;
          margin-bottom: 1.1em;
          padding-inline-start: 1.6rem;
        }
        .blog-content li {
          margin-top: 0.45em;
          margin-bottom: 0.45em;
          padding-inline-start: 0.2rem;
        }
        .blog-content ul > li::marker,
        .blog-content ol > li::marker {
          color: #d97706; /* amber-600 */
          font-weight: 700;
        }
        .blog-content code:not(pre > code) {
          background-color: #f5f5f4; /* stone-100 */
          color: #b45309;
          padding: 0.2em 0.45em;
          border-radius: 0.375rem;
          font-size: 0.88em;
          font-weight: 600;
        }
        .blog-content pre {
          background-color: #1c1917; /* stone-900 */
          color: #e7e5e4;
          border-radius: 0.75rem;
          padding: 1.25rem 1.4rem;
          margin: 1.8em 0;
          overflow-x: auto;
        }
        .blog-content pre code {
          background: transparent;
          color: inherit;
          padding: 0;
          font-size: 0.875rem;
          line-height: 1.7;
        }
        .blog-content img {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 0.85rem;
          margin: 2em 0;
          box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.22);
        }
        .blog-content figure {
          margin: 3.2em 0;
        }
        .blog-content figure img {
          aspect-ratio: 16 / 9;
          margin: 0;
          object-fit: cover;
        }
        .blog-content figcaption {
          margin-top: 0.8rem;
          color: #78716c;
          font-size: 0.82rem;
          line-height: 1.5;
        }
        .blog-content .story-image-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          max-width: none;
          margin: 3.2em 0;
        }
        .blog-content .story-image-grid figure {
          margin: 0;
        }
        .blog-content .story-image-grid img {
          height: 100%;
          min-height: 19rem;
        }
        .blog-content .story-pull-quote {
          border: 0;
          border-radius: 1.25rem;
          background: #0f172a;
          color: #f8fafc;
          font-family: inherit;
          font-size: clamp(1.45rem, 3.5vw, 2.25rem);
          font-style: normal;
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.25;
          max-width: none;
          padding: clamp(1.5rem, 5vw, 3rem);
        }
        .blog-content .story-pull-quote p {
          max-width: 26ch;
        }
        .blog-content hr {
          border: 0;
          height: 1px;
          background: #ece3d4;
          margin: 2.8em 0;
        }
        .blog-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.8em 0;
        }
        .blog-content th,
        .blog-content td {
          border: 1px solid #d6d3d1;
          padding: 0.75rem;
          text-align: start;
          vertical-align: top;
        }
        .blog-content th {
          background: #f5f5f4;
          color: #1c1917;
        }
        .blog-content details {
          border: 1px solid #d6d3d1;
          border-radius: 0.75rem;
          padding: 0.85rem 1rem;
          margin: 1rem 0;
          background: #fafaf9;
        }
        .blog-content summary {
          color: #1c1917;
          cursor: pointer;
          font-weight: 700;
        }

        /* The storefront utility bridge recolours standard Tailwind surfaces.
           Rich article HTML is authored content, so its literal editorial
           colours need an explicit dark palette as well. Keep every content
           primitive readable, including future tables and FAQ details. */
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-card {
          background-color: #111827;
          border-color: #334155;
          color: #e2e8f0;
          --tw-ring-color: #334155;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content {
          color: #e2e8f0;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content :is(h2, h3, h4, strong, summary) {
          color: #f8fafc;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content h2 {
          border-bottom-color: #475569;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content a {
          color: #fbbf24;
          background-image: linear-gradient(#b45309, #b45309);
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content a:hover {
          color: #fde68a;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content blockquote {
          background: #1e293b;
          color: #cbd5e1;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content code:not(pre > code) {
          background-color: #020617;
          color: #fbbf24;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content hr {
          background: #475569;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content :is(th, td, details) {
          border-color: #475569;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content :is(th, details) {
          background: #1e293b;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .story-metrics {
          border-color: #334155;
          background: #334155;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .story-metrics > div {
          background: #111827;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .story-metrics strong,
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .feature-article-body > h2:first-child {
          color: #f8fafc;
        }
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .story-metrics span,
        html[data-storefront-theme="dark"] body.storefront-theme .blog-post-page .blog-content figcaption {
          color: #cbd5e1;
        }
        @media (max-width: 640px) {
          .blog-content {
            font-size: 1.05rem;
          }
          .blog-content h2 {
            font-size: 1.6rem;
          }
          .blog-content > p:first-of-type::first-letter {
            font-size: 3em;
          }
          .story-metrics {
            grid-template-columns: 1fr;
          }
          .story-metrics > div {
            min-height: 6.5rem;
          }
          .blog-content .story-image-grid {
            grid-template-columns: 1fr;
          }
          .blog-content .story-image-grid img {
            min-height: 0;
          }
        }
      `}</style>
    </div>
  );
}
