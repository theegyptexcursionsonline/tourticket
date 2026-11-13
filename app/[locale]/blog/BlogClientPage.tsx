'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Calendar, Clock, User, Tag, Eye, Heart, Search, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { imageMetadataFor } from '@/lib/content/imageMetadata';
import { blogCategoryLabel, countValues } from '@/lib/blog/blogDisplay';
import type { BlogCardData } from '@/lib/blog/blogCards';

interface BlogClientPageProps {
  blogs: BlogCardData[];
  categories: { value: string; count: number }[];
  featuredPosts: BlogCardData[];
}

// Tag shortcuts in the side panel. They are search terms matched against the
// stored tags of each post, so they stay as stored rather than being translated.
const POPULAR_TAGS = ['travel-tips', 'budget-travel', 'photography', 'adventure', 'food', 'culture'];

const BlogCard = ({ blog }: { blog: BlogCardData }) => {
  const t = useTranslations('blog');
  const category = blogCategoryLabel(t, blog.category);
  return (
  <Link href={`/blog/${blog.slug}`} className="group block bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200">
    <div className="relative h-64 overflow-hidden">
      <Image
        src={blog.featuredImage}
        alt={imageMetadataFor(blog.featuredImage, blog.imageMetadata, blog.title).alt}
        title={imageMetadataFor(blog.featuredImage, blog.imageMetadata, blog.title).title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
      
      {/* Category Badge */}
      {category ? (
        <div className="absolute top-4 start-4">
          <span className="px-3 py-1.5 bg-indigo-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
            {category}
          </span>
        </div>
      ) : null}
      
      {/* Featured Badge */}
      {blog.featured && (
        <div className="absolute top-4 end-4">
          <span className="px-3 py-1.5 bg-yellow-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold">
            {t('featured')}
          </span>
        </div>
      )}
    </div>
    
    <div className="p-6">
      <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 mb-3 line-clamp-2">
        {blog.title}
      </h3>
      
      <p className="text-slate-600 text-sm mb-4 line-clamp-3">
        {blog.excerpt}
      </p>
      
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{blog.author}</span>
          </div>
          {blog.readTime ? (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{t('readTime', countValues(blog.readTime))}</span>
            </div>
          ) : null}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{blog.views}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            <span>{blog.likes}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        {blog.publishedDateText ? (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            <span>{blog.publishedDateText}</span>
          </div>
        ) : <span />}
        
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-500">{blog.tags[0]}</span>
            {blog.tags.length > 1 && (
              <span className="text-xs text-slate-400" dir="ltr">+{blog.tags.length - 1}</span>
            )}
          </div>
        )}
      </div>
    </div>
  </Link>
  );
};

const FeaturedBlogCard = ({ blog }: { blog: BlogCardData }) => {
  const t = useTranslations('blog');
  const category = blogCategoryLabel(t, blog.category);
  return (
  <Link href={`/blog/${blog.slug}`} className="group block relative h-96 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
    <Image
      src={blog.featuredImage}
      alt={imageMetadataFor(blog.featuredImage, blog.imageMetadata, blog.title).alt}
      title={imageMetadataFor(blog.featuredImage, blog.imageMetadata, blog.title).title}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
    
    <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
          {t('featured')}
        </span>
        {category ? (
          <span className="px-3 py-1 bg-indigo-500/80 backdrop-blur-sm rounded-full">
            {category}
          </span>
        ) : null}
      </div>
      
      <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-indigo-300 transition-colors duration-200">
        {blog.title}
      </h2>
      
      <p className="text-slate-200 mb-4 line-clamp-2">
        {blog.excerpt}
      </p>
      
      <div className="flex items-center gap-6 text-sm text-slate-300">
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>{blog.author}</span>
        </div>
        {blog.readTime ? (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{t('readTime', countValues(blog.readTime))}</span>
          </div>
        ) : null}
        {blog.publishedDateText ? (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{blog.publishedDateText}</span>
          </div>
        ) : null}
      </div>
    </div>
  </Link>
  );
};

export default function BlogClientPage({ blogs, categories, featuredPosts }: BlogClientPageProps) {
  const t = useTranslations('blog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const filteredBlogs = React.useMemo(() => {
    let filtered = blogs;
    
    if (searchTerm) {
      filtered = filtered.filter(blog =>
        blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(blog => blog.category === selectedCategory);
    }
    
    return filtered;
  }, [searchTerm, selectedCategory, blogs]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
              {t('list.title')}
            </h1>
            <p className="text-xl md:text-2xl text-indigo-200 mb-8">
              {t('list.subtitle')}
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('list.searchPlaceholder')}
                aria-label={t('list.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full ps-12 pe-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl placeholder-slate-300 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">{t('list.featuredHeading')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPosts.map((post) => (
                <FeaturedBlogCard key={post._id} blog={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Sidebar */}
            <aside className="lg:w-80 space-y-8">
              {/* Categories */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Filter className="h-5 w-5 text-indigo-500" />
                  {t('list.categoriesHeading')}
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`w-full text-start px-4 py-3 rounded-xl transition-all duration-200 ${
                      selectedCategory === '' 
                        ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t('list.allArticles', { count: String(blogs.length) })}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`w-full text-start px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-between ${
                        selectedCategory === category.value 
                          ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{blogCategoryLabel(t, category.value)}</span>
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                        {category.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Tags */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-indigo-500" />
                  {t('list.popularTags')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchTerm(tag)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm hover:bg-indigo-100 hover:text-indigo-700 transition-colors duration-200"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Blog Posts */}
            <main className="flex-1">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedCategory
                    ? t('list.categoryHeading', { category: blogCategoryLabel(t, selectedCategory) })
                    : t('list.latestHeading')
                  }
                </h2>
                <span className="text-slate-500">
                  {t('list.articleCount', countValues(filteredBlogs.length))}
                </span>
              </div>

              {filteredBlogs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredBlogs.map((blog) => (
                    <BlogCard key={blog._id} blog={blog} />
                  ))}
                </div>
              ) : blogs.length === 0 ? (
                // Nothing is published yet: there is no search to adjust and nothing to reset.
                <div className="text-center py-16">
                  <h3 className="text-xl font-bold text-slate-700 mb-3">{t('list.emptyTitle')}</h3>
                  <p className="text-slate-500 max-w-md mx-auto">{t('list.emptyBody')}</p>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 bg-slate-200 rounded-full flex items-center justify-center">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 mb-3">{t('list.noResultsTitle')}</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-6">
                    {t('list.noResultsBody')}
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('');
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors duration-200"
                  >
                    {t('list.showAll')}
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
