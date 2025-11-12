'use client';

import { useEffect, useRef } from 'react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat } from 'react-instantsearch';
import 'instantsearch.css/themes/satellite.css';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Helper function to create tour card HTML
const createTourCardHTML = (tour: any): string => {
  const discountPercent = tour.discountPrice && tour.discountPrice < tour.price
    ? Math.round(((tour.price - tour.discountPrice) / tour.price) * 100)
    : 0;

  return `
    <a href="/tours/${tour.slug || tour.objectID}" target="_blank" rel="noopener noreferrer"
       class="tour-card-link group bg-white border-2 border-blue-100 rounded-2xl overflow-hidden hover:shadow-2xl hover:border-blue-300 transition-all duration-300 hover:-translate-y-1 block mb-4">
      ${(tour.image || tour.images?.[0] || tour.primaryImage) ? `
        <div class="relative w-full h-48 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
          <img src="${tour.image || tour.images?.[0] || tour.primaryImage}"
               alt="${tour.title || 'Tour'}"
               class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ${tour.isFeatured ? `
            <div class="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
              <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Featured
            </div>
          ` : ''}
          ${discountPercent > 0 ? `
            <div class="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
              Save ${discountPercent}%
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="p-5">
        <h3 class="font-bold text-base text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          ${tour.title || 'Untitled Tour'}
        </h3>

        ${tour.description ? `
          <p class="text-sm text-slate-600 mb-3 line-clamp-2">${tour.description}</p>
        ` : ''}

        <div class="flex flex-wrap items-center gap-3 mb-3 text-xs">
          ${tour.location ? `
            <span class="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
              <svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span class="font-medium text-blue-700">${tour.location}</span>
            </span>
          ` : ''}
          ${tour.duration ? `
            <span class="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
              <svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span class="font-medium text-green-700">${tour.duration}</span>
            </span>
          ` : ''}
          ${tour.rating ? `
            <span class="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
              <svg class="w-3.5 h-3.5 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span class="font-medium text-yellow-700">${tour.rating}${tour.reviewCount ? ` (${tour.reviewCount})` : ''}</span>
            </span>
          ` : ''}
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <div class="flex items-center gap-2">
            ${tour.discountPrice && tour.discountPrice < tour.price ? `
              <span class="text-slate-400 text-sm line-through">$${tour.price}</span>
              <span class="text-blue-600 font-bold text-xl">$${tour.discountPrice}</span>
            ` : tour.price ? `
              <span class="text-blue-600 font-bold text-xl">$${tour.price}</span>
            ` : ''}
          </div>
          <span class="text-blue-600 text-sm font-semibold group-hover:translate-x-1 transition-transform">
            View Details →
          </span>
        </div>
      </div>
    </a>
  `;
};

export default function AIAgentWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Function to transform JSON messages into tour cards
    const transformMessages = () => {
      if (!containerRef.current) return;

      // Try multiple selectors to find messages
      const messageSelectors = [
        '.ais-Chat-message--assistant',
        '.ais-Chat-message',
        '[class*="Chat-message"]',
        '[class*="assistant"]'
      ];

      let messages: NodeListOf<Element> | null = null;
      for (const selector of messageSelectors) {
        const found = containerRef.current.querySelectorAll(selector);
        if (found.length > 0) {
          messages = found;
          break;
        }
      }

      if (!messages || messages.length === 0) {
        // Fallback: search all divs for JSON content
        const allDivs = containerRef.current.querySelectorAll('div');
        allDivs.forEach((div) => {
          processElement(div);
        });
        return;
      }

      messages.forEach((message) => {
        processElement(message);
      });
    };

    // Helper function to extract JSON objects from text
    const extractJSONObjects = (text: string): any[] => {
      const tours: any[] = [];
      let depth = 0;
      let jsonStart = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === '{') {
          if (depth === 0) {
            jsonStart = i;
          }
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0 && jsonStart !== -1) {
            const jsonStr = text.substring(jsonStart, i + 1);
            try {
              const obj = JSON.parse(jsonStr);
              // Check if it's a tour object
              if (obj.title && obj.slug) {
                tours.push(obj);
              }
            } catch (e) {
              // Not valid JSON, skip
            }
            jsonStart = -1;
          }
        }
      }

      return tours;
    };

    // Helper function to process an element
    const processElement = (element: Element) => {
      // Skip if already processed
      if (element.classList.contains('tour-cards-processed')) return;

      const text = element.textContent || '';

      // Check if element contains tour JSON data
      if (text.includes('"title"') && text.includes('"slug"')) {
        try {
          const tours = extractJSONObjects(text);

          if (tours.length > 0) {
            console.log('Found tours to transform:', tours);

            // Create tour cards HTML
            const cardsHTML = tours.map(tour => createTourCardHTML(tour)).join('');
            const wrapper = document.createElement('div');
            wrapper.className = 'tour-cards-container space-y-3';

            if (tours.length > 1) {
              wrapper.innerHTML = `
                <p class="text-sm text-slate-600 mb-3">I found ${tours.length} tours for you:</p>
                <div class="space-y-4 max-w-md">${cardsHTML}</div>
              `;
            } else {
              wrapper.innerHTML = `<div class="space-y-4 max-w-md">${cardsHTML}</div>`;
            }

            // Replace content with tour cards
            element.innerHTML = '';
            element.appendChild(wrapper);
            element.classList.add('tour-cards-processed');
          }
        } catch (error) {
          console.error('Error transforming tour message:', error);
        }
      }
    };

    // Set up MutationObserver to watch for new messages with debouncing
    let timeoutId: NodeJS.Timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(transformMessages, 300);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Initial transformation with delay to ensure content is loaded
      setTimeout(transformMessages, 500);
      setTimeout(transformMessages, 1500);
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="hidden md:block fixed bottom-6 left-6 z-[45]">
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        <Chat
          agentId={AGENT_ID}
          classNames={{
            root: 'ai-chat-root',
            chatMessage: 'ai-chat-message',
            userMessage: 'ai-user-message',
            assistantMessage: 'ai-assistant-message'
          }}
        />
      </InstantSearch>

      {/* Enhanced styling for tour card display */}
      <style jsx global>{`
        /* Chat container */
        .ais-Chat {
          font-family: inherit;
          max-width: 450px;
        }

        /* Message styling */
        .ais-Chat-message {
          margin-bottom: 1rem;
        }

        /* Assistant messages containing cards */
        .ais-Chat-message--assistant .ais-Chat-message-content {
          background: transparent !important;
          padding: 0.5rem !important;
        }

        .ais-Chat-message--assistant .ais-Chat-message-content.tour-cards-processed {
          background: transparent !important;
          padding: 0 !important;
        }

        /* User messages */
        .ais-Chat-message--user .ais-Chat-message-content,
        .ais-Chat [class*="message--user"] [class*="message-content"] {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border-radius: 1rem !important;
          padding: 0.75rem 1rem !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }

        /* Tour cards styling - scoped to AI chat only */
        .ais-Chat .tour-card-link {
          text-decoration: none;
          display: block;
        }

        .ais-Chat .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        /* Smooth transition for card rendering */
        .tour-cards-container {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Scrollbar styling */
        .ais-Chat-messages::-webkit-scrollbar,
        [class*="Chat-messages"]::-webkit-scrollbar {
          width: 6px;
        }

        .ais-Chat-messages::-webkit-scrollbar-track,
        [class*="Chat-messages"]::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .ais-Chat-messages::-webkit-scrollbar-thumb,
        [class*="Chat-messages"]::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .ais-Chat-messages::-webkit-scrollbar-thumb:hover,
        [class*="Chat-messages"]::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}