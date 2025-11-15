'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Search, ChevronUp, MapPin, Clock, AlertCircle, Compass, Tag, FileText, MessageCircle, ArrowLeft, Bot, Loader2, ChevronLeft, ChevronRight, DollarSign, Star, Send } from 'lucide-react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Index, useSearchBox, useHits, Configure, Chat } from 'react-instantsearch';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'instantsearch.css/themes/satellite.css';

// --- Algolia Config ---
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const INDEX_TOURS = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';
const INDEX_DESTINATIONS = 'destinations';
const INDEX_CATEGORIES = 'categories';
const INDEX_BLOGS = 'blogs';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';

// Create search client outside component to avoid recreating on every render
const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Tour card creation helper
const createTourCardHTML = (tour: any): string => {
  const discountPercent = tour.discountPrice && tour.discountPrice < tour.price
    ? Math.round(((tour.price - tour.discountPrice) / tour.price) * 100)
    : 0;

  return `
    <a href="/tours/${tour.slug || tour.objectID}" target="_blank" rel="noopener noreferrer"
       class="tour-card-link group bg-white border border-blue-100 rounded-lg overflow-hidden hover:shadow-md hover:border-blue-300 transition-all duration-300 block cursor-pointer flex-shrink-0 w-[240px]">
      ${(tour.image || tour.images?.[0] || tour.primaryImage) ? `
        <div class="relative w-full h-32 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
          <img src="${tour.image || tour.images?.[0] || tour.primaryImage}"
               alt="${tour.title || 'Tour'}"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ${tour.isFeatured ? `
            <div class="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-md">
              <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Featured
            </div>
          ` : ''}
          ${discountPercent > 0 ? `
            <div class="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
              -${discountPercent}%
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="p-2.5">
        <h3 class="font-semibold text-xs text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
          ${tour.title || 'Untitled Tour'}
        </h3>

        <div class="flex flex-wrap items-center gap-1.5 mb-2 text-[10px]">
          ${tour.location ? `
            <span class="flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
              <span class="font-medium text-blue-700">${tour.location}</span>
            </span>
          ` : ''}
          ${tour.duration ? `
            <span class="flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="font-medium text-green-700">${tour.duration}</span>
            </span>
          ` : ''}
          ${tour.rating ? `
            <span class="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-full">
              <svg class="w-2.5 h-2.5 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span class="font-medium text-yellow-700">${tour.rating}</span>
            </span>
          ` : ''}
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <div class="flex items-center gap-1">
            ${tour.discountPrice && tour.discountPrice < tour.price ? `
              <span class="text-slate-400 text-[10px] line-through">$${tour.price}</span>
              <span class="text-blue-600 font-bold text-base">$${tour.discountPrice}</span>
            ` : tour.price ? `
              <span class="text-blue-600 font-bold text-base">$${tour.price}</span>
            ` : ''}
          </div>
          <span class="text-blue-600 text-[10px] font-semibold group-hover:translate-x-0.5 transition-transform">
            View →
          </span>
        </div>
      </div>
    </a>
  `;
};

// Custom SearchBox component
function CustomSearchBox({ searchQuery, onSearchChange }: { searchQuery: string; onSearchChange: (value: string) => void }) {
  const { refine } = useSearchBox();

  useEffect(() => {
    refine(searchQuery);
  }, [searchQuery, refine]);

  return null;
}

// Custom Hits components for each index type
function TourHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Tours
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/tours/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-blue-500/5 hover:via-indigo-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:via-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-14 md:w-20 h-14 md:h-20 rounded-xl md:rounded-2xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              {(hit.image || hit.images?.[0] || hit.primaryImage) ? (
                <img
                  src={hit.image || hit.images?.[0] || hit.primaryImage}
                  alt={hit.title || 'Tour'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200"><svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
                  <MapPin className="w-8 h-8 text-blue-600" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 line-clamp-2 md:truncate group-hover:text-blue-600 transition-colors duration-300">
                {hit.title || 'Untitled Tour'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.location && (
                  <span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg">
                    <MapPin className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} />
                    <span className="font-medium">{hit.location}</span>
                  </span>
                )}
                {hit.duration && (
                  <span className="flex items-center gap-1 md:gap-1.5 bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg">
                    <Clock className="w-2.5 md:w-3 h-2.5 md:h-3 text-gray-400" strokeWidth={2.5} />
                    <span className="font-medium">{hit.duration} days</span>
                  </span>
                )}
                {(hit.price || hit.discountPrice) && (
                  <span className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-bold text-blue-600 text-[10px] md:text-xs">
                    ${hit.discountPrice || hit.price}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

function DestinationHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Compass className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Destinations
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/destinations/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:via-teal-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:via-teal-500/5 group-hover:to-cyan-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <Compass className="w-6 md:w-7 h-6 md:h-7 text-emerald-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-emerald-600 transition-colors duration-300">
                {hit.name || 'Untitled Destination'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.country && (
                  <span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">{hit.country}</span>
                )}
                {hit.tourCount && (
                  <span className="bg-emerald-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-emerald-700">
                    {hit.tourCount} tours
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

function CategoryHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-purple-500/5 via-fuchsia-500/5 to-pink-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Tag className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Categories
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/categories/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-purple-500/5 hover:via-fuchsia-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-fuchsia-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:via-fuchsia-500/5 group-hover:to-pink-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <Tag className="w-6 md:w-7 h-6 md:h-7 text-purple-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-purple-600 transition-colors duration-300">
                {hit.name || 'Untitled Category'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5">
                {hit.tourCount && (
                  <span className="bg-purple-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-purple-700">
                    {hit.tourCount} tours
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

function BlogHits({ onHitClick, limit = 5 }: { onHitClick?: () => void; limit?: number }) {
  const { hits } = useHits();
  const limitedHits = hits.slice(0, limit);

  if (limitedHits.length === 0) return null;

  return (
    <div>
      <div className="px-4 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2 md:gap-2.5">
          <div className="w-5 md:w-6 h-5 md:h-6 rounded-lg md:rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <FileText className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[11px] md:text-xs font-semibold text-gray-700 tracking-wide">
            Blog Posts
          </span>
          <span className="ml-auto text-[10px] md:text-xs font-medium text-gray-400 bg-gray-100/80 backdrop-blur-sm px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
            {hits.length}
          </span>
        </div>
      </div>
      {limitedHits.map((hit: any, index) => (
        <motion.a
          key={hit.objectID}
          href={`/blog/${hit.slug || hit.objectID}`}
          onClick={onHitClick}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="block px-3 md:px-6 py-3 md:py-4 hover:bg-gradient-to-r hover:from-amber-500/5 hover:via-orange-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 last:border-0 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-orange-500/0 to-red-500/0 group-hover:from-amber-500/5 group-hover:via-orange-500/5 group-hover:to-red-500/5 transition-all duration-500" />
          <div className="flex items-center gap-2.5 md:gap-4 relative z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
              <FileText className="w-6 md:w-7 h-6 md:h-7 text-amber-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm md:text-[15px] leading-snug mb-1 md:mb-1.5 truncate group-hover:text-amber-600 transition-colors duration-300">
                {hit.title || 'Untitled Blog Post'}
              </div>
              <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1.5 md:gap-2.5 flex-wrap">
                {hit.category && (
                  <span className="bg-gray-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium">{hit.category}</span>
                )}
                {hit.readTime && (
                  <span className="bg-amber-50/80 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg font-medium text-amber-700">
                    {hit.readTime} min read
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  );
}

// Tour Card Component for AI Chat
const TourCard = ({ tour }: { tour: any }) => (
  <motion.a
    href={`/tours/${tour.slug}`}
    target="_blank"
    rel="noopener noreferrer"
    className="group block flex-shrink-0 w-[240px] bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300"
    whileHover={{ y: -4 }}
  >
    {tour.image && (
      <div className="relative h-32 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {tour.duration && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-medium">
            {tour.duration}
          </div>
        )}
      </div>
    )}
    <div className="p-2.5">
      <h3 className="font-semibold text-xs mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {tour.title}
      </h3>
      {tour.location && (
        <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-1.5">
          <MapPin className="w-2.5 h-2.5" />
          <span className="line-clamp-1">{tour.location}</span>
        </div>
      )}
      {tour.rating && (
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-medium">{tour.rating}</span>
          {tour.reviews && <span className="text-[10px] text-gray-400">({tour.reviews})</span>}
        </div>
      )}
      {tour.price && (
        <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
          <DollarSign className="w-3 h-3" />
          <span>{tour.price}</span>
        </div>
      )}
    </div>
  </motion.a>
);

// Tour Slider Component for AI Chat
const TourSlider = ({ tours }: { tours: any[] }) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 260;
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full">
      {tours.length > 1 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      <div
        ref={sliderRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth py-1 px-1"
      >
        {tours.map((tour, idx) => (
          <TourCard key={idx} tour={tour} />
        ))}
      </div>
    </div>
  );
};

export default function AISearchWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [algoliaError, setAlgoliaError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // AI SDK Chat Setup
  const {
    messages,
    sendMessage,
    isLoading,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `https://${ALGOLIA_APP_ID}.algolia.net/agent-studio/1/agents/${AGENT_ID}/completions?stream=true&compatibilityMode=ai-sdk-5`,
      headers: {
        'x-algolia-application-id': ALGOLIA_APP_ID,
        'x-algolia-api-key': ALGOLIA_SEARCH_KEY,
      },
    }),
  });

  // Scroll detection - show widget after scrolling past hero section
  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = window.innerHeight * 0.8;
      setIsVisible(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(true);
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const searchContainer = target.closest('.ai-search-container');
      const isInputClick = target.closest('.ai-search-input');
      const isResultsClick = target.closest('.motion-div-results');

      if (isExpanded && !searchContainer && !isInputClick && !isResultsClick) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      const timeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded]);

  // Mock recently viewed items
  useEffect(() => {
    setRecentlyViewed([
      { id: 1, title: 'Pyramids of Giza Tour', type: 'Historical', price: 45, duration: '8 hours', slug: 'pyramids-of-giza-tour' },
      { id: 2, title: 'Nile River Cruise', type: 'Cruise', price: 120, duration: '3 days', slug: 'nile-river-cruise' },
      { id: 3, title: 'Cairo City Tour', type: 'City Tour', price: 35, duration: '6 hours', slug: 'cairo-city-tour' },
    ]);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (!chatContainerRef.current) return;
    setTimeout(() => {
      chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
    }, 100);
  }, [messages, isLoading]);

  // Listen for floating button click (openAIAgent event)
  useEffect(() => {
    const openHandler = (e: any) => {
      const query = e.detail?.query || '';
      setIsExpanded(true);
      setChatMode(true);
      if (query) {
        setTimeout(() => sendMessage({ text: query }), 300);
      }
    };

    window.addEventListener('openAIAgent', openHandler);
    return () => window.removeEventListener('openAIAgent', openHandler);
  }, [sendMessage]);

  const handleCloseSearch = () => {
    setIsExpanded(false);
    setSearchQuery('');
  };

  const handleAskAI = () => {
    setChatMode(true);
    if (searchQuery) {
      setTimeout(() => sendMessage({ text: searchQuery }), 300);
    }
  };

  const handleBackToSearch = () => {
    setChatMode(false);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  // State for detected tours
  const [detectedTours, setDetectedTours] = useState<any[]>([]);

  // Parse tour information from text and fetch from Algolia
  const detectAndFetchTours = async (text: string) => {
    try {
      // Try to extract tour titles using regex patterns
      const tourPatterns = [
        /(?:From |)([\w\s:,-]+?)(?:\s+\(\$\d+\))/g, // Matches "Tour Name ($price)"
        /(?:^|\n)([A-Z][\w\s:,-]+?Tour[\w\s]*?)(?:\s+\(\$\d+\)|\n|$)/gm, // Matches lines starting with tour names
      ];

      const potentialTours = new Set<string>();

      for (const pattern of tourPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            potentialTours.add(match[1].trim());
          }
        }
      }

      if (potentialTours.size > 0) {
        // Search Algolia for these tours
        const toursArray = Array.from(potentialTours).slice(0, 5); // Limit to 5 tours
        const searchPromises = toursArray.map(async (tourTitle) => {
          try {
            const response = await searchClient.search([{
              indexName: INDEX_TOURS,
              query: tourTitle,
              params: {
                hitsPerPage: 1,
              }
            }]);
            return response.results[0]?.hits[0];
          } catch (error) {
            console.error('Error searching for tour:', tourTitle, error);
            return null;
          }
        });

        const tours = (await Promise.all(searchPromises)).filter(Boolean);
        if (tours.length > 0) {
          setDetectedTours(tours);
          return tours;
        }
      }
    } catch (error) {
      console.error('Error detecting tours:', error);
    }
    return [];
  };

  // Render tool outputs (tours)
  const renderToolOutput = (obj: any) => {
    if (Array.isArray(obj)) {
      const tours = obj.filter(item => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} />;
    }
    if (obj.title && obj.slug) return <TourSlider tours={[obj]} />;
    if (obj.hits && Array.isArray(obj.hits)) {
      const tours = obj.hits.filter((item: any) => item.title && item.slug);
      if (tours.length > 0) return <TourSlider tours={tours} />;
    }
    return (
      <pre className="bg-gray-900 text-gray-100 p-2 rounded-lg text-[10px] overflow-x-auto">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  };

  // Detect tours in messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const textParts = lastMessage.parts.filter((p: any) => p.type === 'text');
      const fullText = textParts.map((p: any) => p.text).join(' ');
      const hasTourPattern = /(?:Tour|tour).*?\$\d+/i.test(fullText);

      if (hasTourPattern) {
        detectAndFetchTours(fullText);
      }
    }
  }, [messages]);

  // Render message content
  const renderContent = (parts: any[]) => {
    return parts.map((p: any, idx: number) => {
      if (p.type === 'tool-result') {
        try {
          const obj = JSON.parse(p.text);
          return <div key={idx} className="my-2">{renderToolOutput(obj)}</div>;
        } catch {
          return <pre key={idx} className="text-[10px]">{p.text}</pre>;
        }
      }
      if (p.type === 'text') {
        return (
          <div key={idx} className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-[11px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {p.text}
            </ReactMarkdown>
          </div>
        );
      }
      return null;
    });
  };

  // Don't render anything if not visible
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop Blur Overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="fixed inset-0 z-[9999] cursor-pointer"
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(0, 0, 0, 0.15)',
              pointerEvents: 'auto'
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex fixed bottom-4 md:bottom-6 left-0 right-0 z-[10000] justify-center px-3 md:px-6 pointer-events-none"
      >
        <div className="w-full max-w-2xl pointer-events-auto">
          <div className="ai-search-container relative">

            {/* Search Results Panel Above Search Bar */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.94, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 30, scale: 0.94, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: [0.34, 1.26, 0.64, 1] }}
                  className="absolute bottom-full mb-3 left-0 right-0 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl motion-div-results"
                  style={{
                    height: chatMode ? '70vh' : '60vh',
                    maxHeight: chatMode ? '70vh' : '60vh',
                    background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.99), rgba(243, 244, 246, 0.97))',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: '1.5px solid rgba(209, 213, 219, 0.4)',
                    boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.6) inset'
                  }}
                >
                  {/* Search Results Content */}
                  <div className="flex flex-col" style={{ height: '100%' }}>
                    {/* Header */}
                    <div className="px-3 md:px-4 py-2 md:py-2.5 border-b border-gray-200/50 backdrop-blur-xl"
                      style={{
                        background: 'linear-gradient(to right, rgba(59, 130, 246, 0.02), rgba(139, 92, 246, 0.02))'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          {chatMode && (
                            <button
                              onClick={handleBackToSearch}
                              className="mr-1 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <ArrowLeft className="w-3 md:w-3.5 h-3 md:h-3.5 text-gray-600" strokeWidth={2.5} />
                            </button>
                          )}
                          {chatMode ? (
                            <>
                              <Bot className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-500" strokeWidth={2.5} />
                              <span className="text-[11px] md:text-xs font-semibold text-gray-700">
                                AI Travel Assistant
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 text-blue-500" strokeWidth={2.5} />
                              <span className="text-[11px] md:text-xs font-semibold text-gray-700">
                                {searchQuery ? 'Search Results' : 'Recent Activity'}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 md:gap-1.5">
                          {searchQuery && !chatMode && (
                            <motion.button
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              onClick={handleAskAI}
                              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all duration-200 hover:scale-105 shadow-sm"
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                boxShadow: '0 2px 6px -1px rgba(59, 130, 246, 0.3)'
                              }}
                            >
                              <MessageCircle className="w-3 h-3" strokeWidth={2.5} />
                              <span>Ask AI</span>
                            </motion.button>
                          )}
                          <button
                            onClick={() => setIsExpanded(false)}
                            className="text-gray-400 hover:text-gray-600 transition-all duration-200 p-1.5 rounded-lg hover:bg-white/50"
                          >
                            <X className="w-3.5 md:w-4 h-3.5 md:h-4" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Results Area */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto apple-scrollbar" style={{ minHeight: 0 }}>
                      {chatMode ? (
                        /* Chat Interface */
                        <div className="p-3 space-y-2.5 min-h-0">
                          {messages.length === 0 && (
                            <div className="bg-white p-3 rounded-xl border border-blue-100">
                              <div className="flex items-start gap-2 mb-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Bot className="text-white" size={12} />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 text-[11px] mb-0.5">
                                    Hi! I'm your AI Egypt Travel Assistant
                                  </p>
                                  <p className="text-gray-500 text-[10px] leading-relaxed">
                                    Ask me anything — I'll help you find tours, trips, prices, destinations & more.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {messages.map((m, mIdx) => (
                            <div key={m.id}>
                              <div
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[85%] px-2.5 py-2 rounded-xl text-[11px] ${
                                    m.role === 'user'
                                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm'
                                      : 'bg-white text-gray-800 border shadow-sm'
                                  }`}
                                >
                                  {renderContent(m.parts)}
                                </div>
                              </div>
                              {/* Show detected tours after last assistant message */}
                              {m.role === 'assistant' && mIdx === messages.length - 1 && detectedTours.length > 0 && (
                                <div className="mt-2">
                                  <TourSlider tours={detectedTours} />
                                </div>
                              )}
                            </div>
                          ))}

                          {isLoading && (
                            <div className="flex items-center gap-2 text-gray-500 bg-white px-3 py-2 rounded-lg border">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-[10px]">AI is thinking</span>
                            </div>
                          )}
                        </div>
                      ) : algoliaError ? (
                        <div className="p-16 text-center">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-gradient-to-br from-red-50 to-red-100 mb-5 shadow-lg shadow-red-500/10"
                          >
                            <AlertCircle className="w-10 h-10 text-red-500" strokeWidth={2.5} />
                          </motion.div>
                          <p className="text-sm font-semibold text-red-600 mb-2">Search Error</p>
                          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">{algoliaError}</p>
                        </div>
                      ) : searchQuery ? (
                        <InstantSearch searchClient={searchClient} indexName={INDEX_TOURS}>
                          <CustomSearchBox
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                          />

                          <Index indexName={INDEX_TOURS}>
                            <Configure hitsPerPage={5} />
                            <TourHits onHitClick={handleCloseSearch} limit={5} />
                          </Index>

                          <Index indexName={INDEX_DESTINATIONS}>
                            <Configure hitsPerPage={5} />
                            <DestinationHits onHitClick={handleCloseSearch} limit={5} />
                          </Index>

                          <Index indexName={INDEX_CATEGORIES}>
                            <Configure hitsPerPage={5} />
                            <CategoryHits onHitClick={handleCloseSearch} limit={5} />
                          </Index>

                          <Index indexName={INDEX_BLOGS}>
                            <Configure hitsPerPage={5} />
                            <BlogHits onHitClick={handleCloseSearch} limit={5} />
                          </Index>
                        </InstantSearch>
                      ) : (
                        <div>
                          {recentlyViewed.length > 0 ? (
                            recentlyViewed.map((item, index) => (
                              <motion.a
                                key={item.id}
                                href={`/tours/${item.slug || item.id}`}
                                onClick={handleCloseSearch}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05, duration: 0.3 }}
                                className="block px-6 py-4 hover:bg-gradient-to-r hover:from-orange-500/5 hover:via-amber-500/5 hover:to-transparent transition-all duration-300 border-b border-white/5 group relative overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-amber-500/0 to-yellow-500/0 group-hover:from-orange-500/5 group-hover:via-amber-500/5 group-hover:to-yellow-500/5 transition-all duration-500" />
                                <div className="flex items-center gap-4 relative z-10">
                                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ring-1 ring-black/5">
                                    <Clock className="w-7 h-7 text-orange-600" strokeWidth={2.5} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900 text-[15px] leading-snug mb-1.5 group-hover:text-orange-600 transition-colors duration-300">{item.title}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2.5 flex-wrap">
                                      <span className="bg-gray-50/80 backdrop-blur-sm px-2.5 py-1 rounded-lg font-medium">{item.type}</span>
                                      <span className="bg-gray-50/80 backdrop-blur-sm px-2.5 py-1 rounded-lg font-medium">{item.duration}</span>
                                      <span className="bg-gradient-to-r from-orange-50 to-amber-50 px-2.5 py-1 rounded-lg font-bold text-orange-600">${item.price}</span>
                                    </div>
                                  </div>
                                </div>
                              </motion.a>
                            ))
                          ) : (
                            <div className="p-16 text-center">
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-gradient-to-br from-gray-50 to-gray-100 mb-5 shadow-lg shadow-gray-500/5"
                              >
                                <Clock className="w-10 h-10 text-gray-400" strokeWidth={2.5} />
                              </motion.div>
                              <p className="text-sm font-medium text-gray-600">No recent searches</p>
                              <p className="text-xs text-gray-400 mt-1">Start exploring to see your history</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chat Input OR Ask AI Button */}
                    {chatMode ? (
                      <form
                        onSubmit={handleChatSubmit}
                        className="border-t border-gray-200/50 p-2 backdrop-blur-xl flex items-center gap-2 flex-shrink-0"
                        style={{
                          background: 'linear-gradient(to right, rgba(59, 130, 246, 0.02), rgba(139, 92, 246, 0.02))'
                        }}
                      >
                        <input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask about tours, destinations, prices..."
                          disabled={isLoading}
                          className="flex-1 px-2.5 py-2 rounded-lg border bg-gray-50 text-[11px] outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={isLoading || !input.trim()}
                          className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : searchQuery && !chatMode ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="border-t border-gray-200/50 px-3 md:px-4 py-2 md:py-2.5 backdrop-blur-xl"
                        style={{
                          background: 'linear-gradient(to right, rgba(59, 130, 246, 0.02), rgba(139, 92, 246, 0.02))'
                        }}
                      >
                        <button
                          onClick={handleAskAI}
                          className="w-full group relative overflow-hidden rounded-lg transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            boxShadow: '0 2px 8px -2px rgba(59, 130, 246, 0.3)'
                          }}
                        >
                          <div className="relative px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-center gap-2">
                            <MessageCircle className="w-3.5 md:w-4 h-3.5 md:h-4 text-white" strokeWidth={2.5} />
                            <div className="text-white font-semibold text-[11px] md:text-xs truncate">
                              Ask AI about "{searchQuery.slice(0, 25)}{searchQuery.length > 25 ? '...' : ''}"
                            </div>
                            <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 text-white/80 hidden sm:block" strokeWidth={2.5} />
                          </div>
                        </button>
                      </motion.div>
                    ) : null}

                    {/* Trending Section */}
                    {!searchQuery && !chatMode && (
                      <div className="border-t border-gray-200/50 px-3 md:px-4 py-2 md:py-2.5 backdrop-blur-xl"
                        style={{
                          background: 'linear-gradient(to right, rgba(59, 130, 246, 0.02), rgba(139, 92, 246, 0.02))'
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-4 h-4 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                            <Sparkles className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-700">
                            Trending
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['Pyramids', 'Nile Cruise', 'Desert Safari', 'Luxor', 'Tours under $100'].map((trend, index) => (
                            <motion.button
                              key={trend}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.04, duration: 0.15 }}
                              onClick={() => {
                                setSearchQuery(trend);
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium text-gray-600 hover:text-blue-600 transition-all duration-200 hover:scale-105 shadow-sm"
                              style={{
                                background: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(209, 213, 219, 0.3)',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              {trend}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar - Always Visible */}
            <motion.div
              whileHover={{ y: -4, scale: 1.012 }}
              whileTap={{ scale: 0.988 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative group"
            >
              <div className="absolute -inset-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div
                  className="absolute inset-0 rounded-full blur-xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 70%)',
                  }}
                />
              </div>

              <div className="relative rounded-full p-[2px]">
                {isExpanded && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full opacity-80"
                      style={{
                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #3b82f6)',
                        backgroundSize: '300% 100%',
                      }}
                      animate={{
                        backgroundPosition: ['0% 0%', '300% 0%'],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                    <motion.div
                      className="absolute -inset-1 rounded-full opacity-50 blur-md"
                      style={{
                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
                        backgroundSize: '200% 100%',
                      }}
                      animate={{
                        backgroundPosition: ['0% 0%', '200% 0%'],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </>
                )}

                <div
                  className={`relative rounded-full transition-all duration-700 ${
                    isExpanded
                      ? 'shadow-2xl'
                      : 'shadow-lg hover:shadow-xl'
                  }`}
                  style={{
                    background: isExpanded
                      ? 'linear-gradient(135deg, rgba(249, 250, 251, 0.99), rgba(243, 244, 246, 0.97))'
                      : 'linear-gradient(135deg, rgba(249, 250, 251, 0.96), rgba(243, 244, 246, 0.94))',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: isExpanded ? 'none' : '1.5px solid rgba(209, 213, 219, 0.5)',
                    boxShadow: isExpanded
                      ? '0 20px 50px -12px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.6) inset'
                      : '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.4) inset'
                  }}
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsExpanded(true)}
                      placeholder="Ask AI to find your perfect tour..."
                      className="ai-search-input w-full pl-14 md:pl-16 pr-24 md:pr-28 py-3.5 md:py-4 text-sm md:text-[15px] font-semibold text-gray-900 placeholder-gray-400 bg-transparent outline-none cursor-text relative z-10 rounded-full tracking-tight"
                    />

                    <div className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 z-10">
                      <motion.div
                        animate={isExpanded ? {
                          scale: [1, 1.05, 1],
                        } : {}}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <div
                          className="relative w-8 md:w-9 h-8 md:h-9 rounded-xl flex items-center justify-center transition-all duration-500 shadow-lg"
                          style={{
                            background: isExpanded
                              ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                              : 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                            boxShadow: isExpanded
                              ? '0 8px 16px -4px rgba(59, 130, 246, 0.5)'
                              : '0 4px 12px -2px rgba(96, 165, 250, 0.4)'
                          }}
                        >
                          <Search className="w-4.5 md:w-5 h-4.5 md:h-5 text-white relative z-10" strokeWidth={2.5} />
                        </div>
                      </motion.div>
                    </div>

                    <div className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5 md:gap-2 z-10">
                      <motion.button
                        onClick={() => {
                          setIsExpanded(true);
                          setChatMode(true);
                        }}
                        animate={{
                          boxShadow: [
                            '0 0 0 0 rgba(59, 130, 246, 0.4)',
                            '0 0 0 4px rgba(59, 130, 246, 0)',
                          ],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="relative flex items-center gap-1 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl cursor-pointer hover:scale-105 transition-transform"
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
                          border: '1.5px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        <motion.div
                          animate={{
                            rotate: [0, 360],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        >
                          <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4 text-blue-600 relative z-10" strokeWidth={2.5} />
                        </motion.div>
                        <span className="text-[11px] md:text-xs font-black text-blue-600 tracking-tight relative z-10 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          AI
                        </span>
                      </motion.button>

                      {isExpanded && (
                        <motion.div
                          initial={{ rotate: 180, opacity: 0, scale: 0.5 }}
                          animate={{ rotate: 0, opacity: 1, scale: 1 }}
                          exit={{ rotate: -180, opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                          className="relative w-8 md:w-9 h-8 md:h-9 rounded-xl flex items-center justify-center shadow-lg"
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                          }}
                        >
                          <ChevronUp className="w-4.5 md:w-5 h-4.5 md:h-5 text-white relative z-10" strokeWidth={2.5} />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Global Styles */}
      <style jsx global>{`
        .ais-InstantSearch {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif;
        }

        .ais-SearchBox {
          display: none;
        }

        .ais-Hits-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .ais-Hits-item {
          margin: 0;
          padding: 0;
          border: none;
        }

        .apple-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .apple-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px 0;
        }

        .apple-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgba(156, 163, 175, 0.4), rgba(107, 114, 128, 0.4));
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .apple-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgba(107, 114, 128, 0.6), rgba(75, 85, 99, 0.6));
          background-clip: padding-box;
        }

        .ai-search-input {
          cursor: text !important;
        }

        .ai-search-input:focus {
          outline: none;
        }
      `}</style>
    </>
  );
}
