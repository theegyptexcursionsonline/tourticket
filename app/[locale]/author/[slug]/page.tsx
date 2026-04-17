import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { getSeoAlternates } from '@/lib/seo';
import { getAuthorRouteSlug, matchesAuthorSlug } from '@/lib/blogAuthors';
import { Calendar, Clock, Eye, Heart, Sparkles, Tag, User } from 'lucide-react';

type Params = {
  locale: string;
  slug: string;
};

type AuthorPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  category: string;
  author: string;
  authorAvatar?: string;
  authorBio?: string;
  publishedAt?: string | Date;
  readTime?: number;
  views?: number;
  likes?: number;
  tags?: string[];
  featured?: boolean;
};

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

function formatDate(date?: string | Date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCategory(value?: string) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function getAuthorPosts(authorSlug: string) {
  await dbConnect();

  const posts = await Blog.find({ status: 'published' })
    .sort({ publishedAt: -1, createdAt: -1 })
    .select(
      'title slug excerpt featuredImage category author authorAvatar authorBio publishedAt readTime views likes tags featured'
    )
    .lean();

  const authorPosts = posts.filter((post: any) => matchesAuthorSlug(post.author, authorSlug));

  if (authorPosts.length === 0) {
    return null;
  }

  const serializedPosts = JSON.parse(JSON.stringify(authorPosts)) as AuthorPost[];
  const primaryPost = serializedPosts.find((post) => post.authorBio || post.authorAvatar) || serializedPosts[0];
  const displayName = primaryPost.author || authorSlug;
  const normalizedAuthorSlug = getAuthorRouteSlug({ name: displayName }) || authorSlug.toLowerCase();
  const totalViews = serializedPosts.reduce((sum, post) => sum + Number(post.views || 0), 0);
  const totalLikes = serializedPosts.reduce((sum, post) => sum + Number(post.likes || 0), 0);
  const categoryMap = new Map<string, number>();
  const tagMap = new Map<string, number>();

  for (const post of serializedPosts) {
    const categoryKey = formatCategory(post.category);
    if (categoryKey) {
      categoryMap.set(categoryKey, (categoryMap.get(categoryKey) || 0) + 1);
    }

    for (const tag of post.tags || []) {
      if (!tag) continue;
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }
  }

  const categories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  const topTags = Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  const featuredPosts = [...serializedPosts]
    .sort((left, right) => Number(right.views || 0) - Number(left.views || 0))
    .slice(0, 3);

  return {
    author: {
      name: displayName,
      slug: normalizedAuthorSlug,
      bio:
        primaryPost.authorBio ||
        `${displayName} shares practical travel ideas, destination guides, and planning advice for travelers exploring Egypt.`,
      avatar: primaryPost.authorAvatar,
      articleCount: serializedPosts.length,
      totalViews,
      totalLikes,
      categories,
      topTags,
    },
    posts: serializedPosts,
    featuredPosts,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const data = await getAuthorPosts(slug);

    if (!data) {
      return {
        title: 'Author Not Found | Egypt Excursions Online',
        description: 'The author you are looking for does not exist.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    return {
      title: `${data.author.name} | Egypt Excursions Online`,
      description: data.author.bio,
      alternates: getSeoAlternates(`/author/${data.author.slug}`),
      openGraph: {
        title: `${data.author.name} | Egypt Excursions Online`,
        description: data.author.bio,
        images: data.author.avatar ? [data.author.avatar] : undefined,
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.author.name} | Egypt Excursions Online`,
        description: data.author.bio,
        images: data.author.avatar ? [data.author.avatar] : undefined,
      },
    };
  } catch (error) {
    console.error('Author metadata error:', error);
    return {
      title: 'Author | Egypt Excursions Online',
      description: 'Explore travel articles and destination guides from Egypt Excursions Online.',
    };
  }
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await getAuthorPosts(slug);

  if (!data) {
    notFound();
  }

  const { author, posts, featuredPosts } = data;

  return (
    <>
      <CollectionSchema
        name={`${author.name} Articles`}
        description={author.bio}
        url={`/author/${author.slug}`}
        items={posts.map((post) => ({
          name: post.title,
          url: `/blog/${post.slug}`,
          image: post.featuredImage,
        }))}
      />
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-sky-900 text-white">
          <div className="container mx-auto px-4 py-14 md:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.35fr_0.95fr] lg:items-center">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-indigo-100">
                  <Sparkles className="h-4 w-4" />
                  <span>Author Profile</span>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">{author.name}</h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">{author.bio}</p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {author.categories.map((category) => (
                    <span
                      key={category.name}
                      className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100"
                    >
                      {category.name} {category.count > 1 ? `(${category.count})` : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/20 bg-white/10">
                    {author.avatar ? (
                      <Image
                        src={author.avatar}
                        alt={author.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                        {author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-[0.2em] text-indigo-200">Travel Writer</div>
                    <div className="mt-1 text-2xl font-semibold">{author.name}</div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-2xl font-bold">{author.articleCount}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-300">Articles</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-2xl font-bold">{author.totalViews}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-300">Views</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <div className="text-2xl font-bold">{author.totalLikes}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-300">Likes</div>
                  </div>
                </div>

                {author.topTags.length > 0 ? (
                  <div className="mt-8">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Tag className="h-4 w-4 text-indigo-200" />
                      <span>Common Topics</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {author.topTags.map((tag) => (
                        <span
                          key={tag.name}
                          className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                <User className="h-4 w-4" />
                <span>About {author.name}</span>
              </div>
              <p className="mt-5 text-base leading-8 text-slate-700">
                {author.bio}
              </p>
              <p className="mt-4 text-base leading-8 text-slate-700">
                This author page brings together the latest destination guides, practical planning advice, and editorial picks published under {author.name}. It is designed to make it easy for readers to browse topic clusters, discover the strongest articles first, and continue deeper into Egypt travel research.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">What This Author Covers</h2>
              <div className="mt-6 space-y-4">
                {author.categories.length > 0 ? (
                  author.categories.map((category) => (
                    <div key={category.name} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-semibold text-slate-900">{category.name}</div>
                        <div className="text-sm text-slate-500">{category.count} article{category.count === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    Recent destination guides and travel planning content.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {featuredPosts.length > 0 ? (
          <section className="container mx-auto px-4 pb-6">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Popular Reads</h2>
                <p className="mt-2 text-slate-600">The most viewed articles from {author.name}.</p>
              </div>
              <Link href="/blog" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                Browse all articles
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {featuredPosts.map((post) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-56 bg-slate-200">
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : null}
                  </div>
                  <div className="p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                      {formatCategory(post.category)}
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-slate-900">{post.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                    <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {post.views || 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {post.likes || 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readTime || 5} min read
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="container mx-auto px-4 py-14">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Latest Articles by {author.name}</h2>
            <p className="mt-2 text-slate-600">Fresh posts, planning tips, and guides from this author.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post._id}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-52 bg-slate-200">
                  {post.featuredImage ? (
                    <Image
                      src={post.featuredImage}
                      alt={post.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : null}
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                    {formatCategory(post.category)}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900">{post.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>

                  <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(post.publishedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {post.readTime || 5} min read
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {post.views || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
