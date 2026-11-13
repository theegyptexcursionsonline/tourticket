'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { imageMetadataFor, type ImageMetadata } from '@/lib/content/imageMetadata';
import { localizeBlogSummary } from '@/lib/blog/blogCards';
import { blogCategoryLabel, blogReadMinutes, countValues } from '@/lib/blog/blogDisplay';

type Translation = { title?: string; excerpt?: string };
type Post = {
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  imageMetadata?: ImageMetadata[];
  category?: string;
  readTime?: number;
  publishedAt?: string;
  translations?: Record<string, Translation>;
};

export default function HomeBlogSection() {
  const locale = useLocale();
  const t = useTranslations('blog');
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    fetch('/api/blog/latest')
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(Array.isArray(d?.posts) ? d.posts.slice(0, 3) : []))
      .catch(() => setPosts([]));
  }, []);

  // Render nothing until we know there are posts (avoids an empty section).
  if (!posts || posts.length === 0) return null;

  // Same overlay as the blog pages: the language of the visitor, English per untranslated field.
  const localizedPosts = posts.map((post) => localizeBlogSummary(post, locale));

  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-orange-600">{t('home.eyebrow')}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{t('home.title')}</h2>
            <p className="mt-3 max-w-xl text-gray-600">{t('home.subtitle')}</p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-orange-500 hover:text-orange-600"
          >
            {t('home.viewAll')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {localizedPosts.map((post) => {
            const category = blogCategoryLabel(t, post.category);
            const minutes = blogReadMinutes(post.readTime);
            return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-48 overflow-hidden bg-gray-100">
                {post.featuredImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.featuredImage}
                    alt={imageMetadataFor(post.featuredImage, post.imageMetadata, post.title).alt}
                    title={imageMetadataFor(post.featuredImage, post.imageMetadata, post.title).title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
                {category ? (
                  <span className="absolute start-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-800 shadow-sm">
                    {category}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-2 text-lg font-bold leading-snug text-gray-900 transition-colors group-hover:text-orange-600">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">{post.excerpt}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600">
                    {t('home.readMore')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                  </span>
                  {minutes !== null ? (
                    <span className="text-xs text-gray-400">{t('readTime', countValues(minutes))}</span>
                  ) : null}
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
