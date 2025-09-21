// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostClient from './BlogPostClient';
import type { IBlog } from '@/lib/models/Blog';

type Params = { slug: string };

export async function generateStaticParams() {
  await dbConnect();
  const blogs = await Blog.find({ status: 'published' }).select('slug').lean();
  return blogs.map((b: any) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  try {
    await dbConnect();
    const blog = await Blog.findOne({ slug: params.slug, status: 'published' }).lean();

    if (!blog) return { title: 'Blog Post Not Found' };

    return {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt,
      openGraph: {
        title: blog.metaTitle || blog.title,
        description: blog.metaDescription || blog.excerpt,
        images: blog.featuredImage ? [blog.featuredImage] : undefined,
        type: 'article',
        publishedTime: blog.publishedAt?.toISOString(),
        authors: blog.author ? [blog.author] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: blog.metaTitle || blog.title,
        description: blog.metaDescription || blog.excerpt,
        images: blog.featuredImage ? [blog.featuredImage] : undefined,
      },
    };
  } catch (err) {
    console.error('generateMetadata error:', err);
    return { title: 'Blog' };
  }
}

async function getBlogPost(slug: string) {
  await dbConnect();

  const blog = await Blog.findOne({ slug, status: 'published' })
    .populate('relatedDestinations', 'name slug image')
    .populate('relatedTours', 'title slug image discountPrice')
    .lean();

  if (!blog) {
    return { blog: null, relatedPosts: [] };
  }

  // increment views (fire-and-forget style)
  Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).catch(e => {
    console.error('increment view error:', e);
  });

  const relatedPosts = await Blog.find({
    status: 'published',
    category: blog.category,
    _id: { $ne: blog._id }
  })
    .limit(3)
    .sort({ publishedAt: -1 })
    .select('title slug excerpt featuredImage author publishedAt readTime')
    .lean();

  return {
    blog: JSON.parse(JSON.stringify(blog)) as IBlog,
    relatedPosts: JSON.parse(JSON.stringify(relatedPosts)) as IBlog[],
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { blog, relatedPosts } = await getBlogPost(params.slug);

  if (!blog) {
    notFound();
  }

  return (
    <>
      <Header startSolid />
      <main className="pt-20">
        <BlogPostClient blog={blog} relatedPosts={relatedPosts} />
      </main>
      <Footer />
    </>
  );
}
