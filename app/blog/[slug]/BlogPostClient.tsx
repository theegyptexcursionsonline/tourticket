'use client';

import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { IBlog } from '@/lib/models/Blog';
import toast from 'react-hot-toast';

interface BlogPostClientProps {
  blog: IBlog;
  relatedPosts: IBlog[];
}

const ShareButton = ({ blog }: { blog: IBlog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [likes, setLikes] = useState(blog.likes);
  const [hasLiked, setHasLiked] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Check out this amazing travel article: ${blog.title}`;

  const handleShare = (platform: string) => {
    let url = '';
    
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
        setIsOpen(false);
        return;
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      setIsOpen(false);
    }
  };

  const handleLike = async () => {
    if (hasLiked) return;
    
    try {
      const response = await fetch(`/api/blog/${blog.slug}/like`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setLikes(prev => prev + 1);
        setHasLiked(true);
        toast.success('Thanks for liking this post!');
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <button
          onClick={handleLike}
          disabled={hasLiked}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
            hasLiked
              ? 'bg-red-100 text-red-600 cursor-not-allowed'
              : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600'
          }`}
        >
          <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
          <span>{likes}</span>
        </button>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-indigo-100 hover:text-indigo-600 transition-all duration-200"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl border border-slate-200 p-4 min-w-48 z-10">
          <div className="space-y-2">
            <button
              onClick={() => handleShare('facebook')}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
            >
              <Facebook className="h-4 w-4" />
              <span>Facebook</span>
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
            >
              <Twitter className="h-4 w-4" />
              <span>Twitter</span>
            </button>
            <button
              onClick={() => handleShare('copy')}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 rounded-lg transition-colors duration-200"
            >
              <Copy className="h-4 w-4" />
              <span>Copy Link</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const RelatedPostCard = ({ post }: { post: IBlog }) => (
  <Link href={`/blog/${post.slug}`} className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-200">
    <div className="relative h-48 overflow-hidden">
      <Image
        src={post.featuredImage}
        alt={post.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
      />
    </div>
    <div className="p-4">
      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 mb-2 line-clamp-2">
        {post.title}
      </h3>
      <p className="text-slate-600 text-sm mb-3 line-clamp-2">
        {post.excerpt}
      </p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{post.author}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{post.readTime} min read</span>
        </div>
      </div>
    </div>
  </Link>
);

export default function BlogPostClient({ blog, relatedPosts }: BlogPostClientProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Blog</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative h-96 md:h-[500px] overflow-hidden">
        <Image
          src={blog.featuredImage}
          alt={blog.title}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-4 mb-6">
              <span className="px-4 py-2 bg-indigo-500/80 backdrop-blur-sm rounded-full text-sm font-semibold">
                {blog.categoryDisplay}
              </span>
              {blog.featured && (
                <span className="px-4 py-2 bg-yellow-500/80 backdrop-blur-sm rounded-full text-sm font-semibold">
                  Featured
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
              {blog.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-slate-200">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <span className="font-medium">{blog.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{blog.publishedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{blog.readTimeText}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <span>{blog.views} views</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              
              {/* Main Content */}
              <article className="lg:col-span-3">
                {/* Article Header */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      {blog.authorAvatar && (
                        <Image
                          src={blog.authorAvatar}
                          alt={blog.author}
                          width={60}
                          height={60}
                          className="rounded-full"
                        />
                      )}
                      <div>
                        <h3 className="font-bold text-slate-900">{blog.author}</h3>
                        {blog.authorBio && (
                          <p className="text-slate-600 text-sm mt-1">{blog.authorBio}</p>
                        )}
                      </div>
                    </div>
                    
                    <ShareButton blog={blog} />
                  </div>
                  
                  <div className="prose prose-lg prose-slate max-w-none">
                    <p className="text-xl text-slate-700 font-medium leading-relaxed">
                      {blog.excerpt}
                    </p>
                  </div>
                </div>

                {/* Article Body */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                  <div className="prose prose-lg prose-slate max-w-none">
                    <div 
                      dangerouslySetInnerHTML={{ __html: blog.content.replace(/\n/g, '<br />') }}
                      className="whitespace-pre-wrap"
                    />
                  </div>
                </div>

                {/* Tags */}
                {blog.tags && blog.tags.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-indigo-500" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {blog.tags.map((tag, index) => (
                        <Link
                          key={index}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm hover:bg-indigo-100 hover:text-indigo-700 transition-colors duration-200"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Destinations/Tours */}
                {(blog.relatedDestinations?.length > 0 || blog.relatedTours?.length > 0) && (
                  <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Related Content</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {blog.relatedDestinations?.map((destination: any) => (
                        <Link
                          key={destination._id}
                          href={`/destinations/${destination.slug}`}
                          className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
                        >
                          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <ArrowRight className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{destination.name}</h4>
                            <p className="text-sm text-slate-600">Explore destination</p>
                          </div>
                        </Link>
                      ))}
                      
                      {blog.relatedTours?.map((tour: any) => (
                        <Link
                          key={tour._id}
                          href={`/tour/${tour.slug}`}
                          className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                        >
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <ArrowRight className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{tour.title}</h4>
                            <p className="text-sm text-slate-600">Book this tour</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="sticky top-8 space-y-8">
                  
                  {/* Author Card */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">About the Author</h3>
                    <div className="text-center">
                      {blog.authorAvatar && (
                        <Image
                          src={blog.authorAvatar}
                          alt={blog.author}
                          width={80}
                          height={80}
                          className="rounded-full mx-auto mb-4"
                        />
                      )}
                      <h4 className="font-bold text-slate-900 mb-2">{blog.author}</h4>
                      {blog.authorBio && (
                        <p className="text-slate-600 text-sm">{blog.authorBio}</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Article Stats</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Published</span>
                        <span className="font-medium">{blog.publishedDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Reading Time</span>
                        <span className="font-medium">{blog.readTimeText}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Views</span>
                        <span className="font-medium">{blog.views}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Likes</span>
                        <span className="font-medium">{blog.likes}</span>
                      </div>
                    </div>
                  </div>

                  {/* Share Again */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Share This Article</h3>
                    <ShareButton blog={blog} />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">You Might Also Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map((post) => (
                  <RelatedPostCard key={post._id} post={post} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}