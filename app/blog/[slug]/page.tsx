import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostClient from './BlogPostClient';
import { IBlog } from '@/lib/models/Blog';

// This function tells Next.js which blog pages to pre-build
export async function generateStaticParams() {
  await dbConnect();
  const blogs = await Blog.find({ status: 'published' }).select('slug').lean();
  return blogs.map((blog) => ({
    slug: blog.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }) {
  await dbConnect();
  const blog = await Blog.findOne({ slug: params.slug, status: 'published' }).lean();
  
  if (!blog) {
    return {
      title: 'Blog Post Not Found',
    };
  }

  return {
    title: blog.metaTitle || blog.title,
    description: blog.metaDescription || blog.excerpt,
    openGraph: {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt,
      images: [blog.featuredImage],
      type: 'article',
      publishedTime: blog.publishedAt?.toISOString(),
      authors: [blog.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt,
      images: [blog.featuredImage],
    },
  };
}

// Fetch blog post data
async function getBlogPost(slug: string) {
  await dbConnect();

  const blog = await Blog.findOne({ slug, status: 'published' })
    .populate('relatedDestinations', 'name slug image')
    .populate('relatedTours', 'title slug image discountPrice')
    .lean();

  if (!blog) {
    return { blog: null, relatedPosts: [] };
  }

  // Increment view count
  await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

  // Get related posts (same category, excluding current post)
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
    blog: JSON.parse(JSON.stringify(blog)), 
    relatedPosts: JSON.parse(JSON.stringify(relatedPosts))
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
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