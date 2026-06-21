'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

type Translation = { title?: string; excerpt?: string };
type Post = {
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  category?: string;
  readTime?: number;
  publishedAt?: string;
  translations?: Record<string, Translation>;
};

// Section chrome per locale (the site ships en/ar/de/es/fr). Keeps this section
// self-contained without adding keys to all five message files.
const LABELS: Record<string, { eyebrow: string; title: string; subtitle: string; readMore: string; viewAll: string; min: string }> = {
  en: { eyebrow: 'From our blog', title: 'Travel tips & Egypt guides', subtitle: 'Stories, guides, and inspiration to plan your perfect trip.', readMore: 'Read more', viewAll: 'View all articles', min: 'min read' },
  ar: { eyebrow: 'من مدوّنتنا', title: 'نصائح السفر وأدلّة مصر', subtitle: 'قصص وأدلّة وإلهام لتخطيط رحلتك المثالية.', readMore: 'اقرأ المزيد', viewAll: 'عرض كل المقالات', min: 'دقيقة قراءة' },
  de: { eyebrow: 'Aus unserem Blog', title: 'Reisetipps & Ägypten-Guides', subtitle: 'Geschichten, Guides und Inspiration für deine perfekte Reise.', readMore: 'Weiterlesen', viewAll: 'Alle Artikel ansehen', min: 'Min. Lesezeit' },
  es: { eyebrow: 'De nuestro blog', title: 'Consejos de viaje y guías de Egipto', subtitle: 'Historias, guías e inspiración para planear tu viaje perfecto.', readMore: 'Leer más', viewAll: 'Ver todos los artículos', min: 'min de lectura' },
  fr: { eyebrow: 'Notre blog', title: "Conseils de voyage & guides d'Égypte", subtitle: 'Récits, guides et inspiration pour planifier votre voyage idéal.', readMore: 'Lire la suite', viewAll: 'Voir tous les articles', min: 'min de lecture' },
};

export default function HomeBlogSection() {
  const locale = useLocale();
  const L = LABELS[locale] ?? LABELS.en;
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    fetch('/api/blog/latest')
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(Array.isArray(d?.posts) ? d.posts.slice(0, 3) : []))
      .catch(() => setPosts([]));
  }, []);

  // Render nothing until we know there are posts (avoids an empty section).
  if (!posts || posts.length === 0) return null;

  const tr = (p: Post) => (locale !== 'en' ? p.translations?.[locale] : undefined);
  const title = (p: Post) => tr(p)?.title || p.title;
  const excerpt = (p: Post) => tr(p)?.excerpt || p.excerpt;

  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-orange-600">{L.eyebrow}</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{L.title}</h2>
            <p className="mt-3 max-w-xl text-gray-600">{L.subtitle}</p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-orange-500 hover:text-orange-600"
          >
            {L.viewAll}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
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
                    alt={title(post)}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
                {post.category ? (
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-800 shadow-sm">
                    {post.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-2 text-lg font-bold leading-snug text-gray-900 transition-colors group-hover:text-orange-600">
                  {title(post)}
                </h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">{excerpt(post)}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600">
                    {L.readMore}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  {post.readTime ? (
                    <span className="text-xs text-gray-400">{post.readTime} {L.min}</span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
