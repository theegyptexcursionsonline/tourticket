'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import { Calendar, Clock, User, Tag, ArrowLeft, ArrowRight, Share2, Heart } from 'lucide-react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getBlogPostById, getFeaturedBlogPosts } from '@/lib/data/blog';

interface BlogPostPageProps {
  params: { slug: string } | Promise<{ slug: string }>;
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  // Unwrap params promise using React.use() as required by Next.js 15
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const resolvedParams = React.use(params as any) as { slug: string };

  const post = getBlogPostById(resolvedParams.slug);
  const relatedPosts = getFeaturedBlogPosts(3).filter(p => p.id !== post?.id);

  if (!post) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Culture': 'bg-purple-100 text-purple-800',
      'Adventure': 'bg-orange-100 text-orange-800',
      'Food': 'bg-green-100 text-green-800',
      'Travel Tips': 'bg-blue-100 text-blue-800',
      'History': 'bg-red-100 text-red-800',
      'Nature': 'bg-emerald-100 text-emerald-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white text-slate-800 min-h-screen">
      <Header startSolid />

      <main className="pt-20">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-6">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Blog</span>
          </a>
        </div>

        {/* Hero Image */}
        <div className="relative h-64 md:h-96 w-full">
          <Image
            src={post!.image}
            alt={post!.title}
            fill
            style={{ objectFit: 'cover' }}
            className="brightness-75"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Category Badge */}
          <div className="absolute top-6 left-6">
            <span className={`text-sm font-bold px-4 py-2 rounded-full ${getCategoryColor(post!.category)}`}>
              {post!.category}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="absolute top-6 right-6 flex gap-3">
            <button className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors">
              <Heart size={20} />
            </button>
            <button className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors">
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            
            {/* Article Header */}
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                {post!.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-slate-600 mb-6">
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span className="font-medium">{post!.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{formatDate(post!.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>{post!.readTime} min read</span>
                </div>
              </div>

              <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                {post!.excerpt}
              </p>
            </header>

            {/* Article Content */}
            <article className="prose prose-slate prose-lg max-w-none mb-12">
              <div 
                className="article-content"
                dangerouslySetInnerHTML={{ __html: post!.content }}
              />
            </article>

            {/* Tags */}
            <section className="mb-12">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Tags</h3>
              <div className="flex flex-wrap gap-3">
                {post!.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <Tag size={14} />
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Author Bio */}
            <section className="mb-12 p-6 bg-slate-50 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                  <User size={24} className="text-slate-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-slate-900 mb-2">About {post!.author}</h4>
                  <p className="text-slate-600">
                    Our travel experts have years of experience exploring Egypt and sharing insider knowledge 
                    to help you make the most of your Egyptian adventure. Follow their recommendations for 
                    unforgettable experiences.
                  </p>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="bg-slate-50 py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
                  You Might Also Enjoy
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {relatedPosts.map((relatedPost) => (
                    <article
                      key={relatedPost.id}
                      className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group"
                    >
                      <div className="relative h-48 w-full">
                        <Image 
                          src={relatedPost.image}
                          alt={relatedPost.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-4 left-4">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getCategoryColor(relatedPost.category)}`}>
                            {relatedPost.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{formatDate(relatedPost.publishedAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{relatedPost.readTime} min read</span>
                          </div>
                        </div>
                        
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors mb-3 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        
                        <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                          {relatedPost.excerpt}
                        </p>

                        <a
                          href={`/blog/${relatedPost.slug}`}
                          className="inline-flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors group"
                        >
                          <span>Read more</span>
                          <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      <Footer />

      {/* Article Styling */}
      <style jsx global>{`
        .article-content h2 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        
        .article-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #334155;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .article-content p {
          margin-bottom: 1.5rem;
          line-height: 1.75;
          color: #475569;
        }
        
        .article-content ul {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
        }
        
        .article-content li {
          margin-bottom: 0.5rem;
          color: #475569;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
