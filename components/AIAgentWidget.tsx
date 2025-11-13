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

export default function AIAgentWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Utility functions for localStorage and card management
    const getClosedCards = (): Set<string> => {
      const stored = localStorage.getItem('closedTourCards');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    };

    const saveClosedCards = (closedSet: Set<string>) => {
      localStorage.setItem('closedTourCards', JSON.stringify([...closedSet]));
    };

    const generateMessageId = (content: string): string => {
      // Generate a simple hash from the content for consistency across reloads
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return `msg-${Math.abs(hash)}`;
    };

    const hasVisibleCards = (container: HTMLElement): boolean => {
      return container.querySelectorAll('.tour-results-wrapper').length > 0;
    };

    const toggleAIIcon = (hasCards: boolean) => {
      const chatContainer = containerRef.current?.querySelector('.ais-Chat');
      if (chatContainer) {
        if (hasCards) {
          chatContainer.classList.add('has-tour-cards');
        } else {
          chatContainer.classList.remove('has-tour-cards');
        }
      }
    };

    // Load closed cards from localStorage
    const closedCards = getClosedCards();

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

      // Check if element is still in the document
      if (!document.contains(element)) return;

      const text = element.textContent || '';

      // Check if element contains tour JSON data
      if (text.includes('"title"') && text.includes('"slug"')) {
        try {
          const tours = extractJSONObjects(text);

          if (tours.length > 0) {
            // Generate unique ID for this message based on content hash
            const messageId = generateMessageId(text);

            // Check if this message's cards were previously closed
            if (closedCards.has(messageId)) {
              // Mark as processed but don't show cards
              element.classList.add('tour-cards-processed');
              (element as HTMLElement).style.display = 'none';
              return;
            }

            console.log('Found tours to transform:', tours);

            // Mark as processed first to prevent race conditions
            element.classList.add('tour-cards-processed');
            // Store message ID as data attribute
            (element as HTMLElement).dataset.messageId = messageId;

            // Hide the element immediately to prevent JSON from showing
            (element as HTMLElement).style.opacity = '0';

            // Extract any text before the JSON (like a descriptive message)
            let introText = '';
            const firstBraceIndex = text.indexOf('{');
            if (firstBraceIndex > 0) {
              const beforeJson = text.substring(0, firstBraceIndex).trim();
              // Only include if it's a meaningful message (not "Results" or similar)
              if (beforeJson &&
                  !beforeJson.toLowerCase().includes('result') &&
                  beforeJson.length > 5 &&
                  beforeJson.length < 200) {
                introText = beforeJson;
              }
            }

            // Create tour cards HTML
            const cardsHTML = tours.map(tour => createTourCardHTML(tour)).join('');
            const wrapper = document.createElement('div');
            wrapper.className = 'tour-cards-container space-y-3';

         // Build the final HTML without showing JSON or "Results" text
            let finalHTML = `
              <div class="tour-results-wrapper relative" data-message-id="${messageId}">
                <button class="close-tour-cards absolute -top-1 -right-1 bg-slate-800 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-slate-900 transition-colors z-10 text-xs font-bold" aria-label="Close">×</button>
            `;
            if (introText) {
              finalHTML += `<p class="text-xs text-slate-600 mb-2">${introText}</p>`;
            } else if (tours.length > 1) {
              finalHTML += `<p class="text-xs text-slate-600 mb-2">Found ${tours.length} tours:</p>`;
            }
            finalHTML += `<div class="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-transparent">${cardsHTML}</div>`;
            finalHTML += `</div>`;
            wrapper.innerHTML = finalHTML;

            // Attach click handlers to all tour card links and close button
            setTimeout(() => {
              const links = wrapper.querySelectorAll('.tour-card-link');
              links.forEach(link => {
                link.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const href = (link as HTMLAnchorElement).href;
                  window.open(href, '_blank', 'noopener,noreferrer');
                });
              });

              // Add close button handler
              const closeBtn = wrapper.querySelector('.close-tour-cards');
              if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const resultsWrapper = wrapper.querySelector('.tour-results-wrapper') as HTMLElement;
                  if (resultsWrapper) {
                    // Get message ID and save to localStorage
                    const msgId = resultsWrapper.dataset.messageId;
                    if (msgId) {
                      closedCards.add(msgId);
                      saveClosedCards(closedCards);
                    }

                    // Animate and remove
                    resultsWrapper.style.animation = 'fadeOut 0.2s ease-out';
                    setTimeout(() => {
                      resultsWrapper.remove();

                      // Check if any cards remain visible and toggle AI icon
                      if (containerRef.current && !hasVisibleCards(containerRef.current)) {
                        toggleAIIcon(false);
                      }
                    }, 200);
                  }
                });
              }
            }, 0);

            // Toggle AI icon to show cards are visible
            setTimeout(() => {
              toggleAIIcon(true);
            }, 0);

            // Safely replace content - use requestAnimationFrame to avoid conflicts
            requestAnimationFrame(() => {
              if (document.contains(element)) {
                try {
                  // Clear and append in a safer way
                  while (element.firstChild) {
                    element.removeChild(element.firstChild);
                  }
                  element.appendChild(wrapper);
                  // Fade in the clean result
                  (element as HTMLElement).style.opacity = '1';
                  (element as HTMLElement).style.transition = 'opacity 0.3s ease-in';
                } catch (err) {
                  console.error('Error replacing content:', err);
                  // Fallback: just set innerHTML
                  element.innerHTML = wrapper.innerHTML;
                  (element as HTMLElement).style.opacity = '1';
                }
              }
            });
          }
        } catch (error) {
          console.error('Error transforming tour message:', error);
          // If transformation fails, show the element again
          (element as HTMLElement).style.opacity = '1';
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

  // Listen for custom event from AI Search Widget
  useEffect(() => {
    const handleOpenAIAgent = (event: CustomEvent) => {
      const query = event.detail?.query;
      console.log('AI Agent opened with query:', query);

      if (query) {
        // Find the chat input and trigger button
        setTimeout(() => {
          // Try to find the Algolia chat input
          const chatInput = containerRef.current?.querySelector('.ais-Chat-input') as HTMLInputElement;
          const chatTextarea = containerRef.current?.querySelector('.ais-Chat-input textarea') as HTMLTextAreaElement;
          const chatButton = containerRef.current?.querySelector('.ais-Chat-trigger') as HTMLButtonElement;

          // Open the chat if it's closed
          if (chatButton) {
            chatButton.click();
          }

          // Set the query in the input
          setTimeout(() => {
            const input = chatTextarea || chatInput;
            if (input) {
              input.value = query;
              input.focus();

              // Trigger input event to update React state
              const inputEvent = new Event('input', { bubbles: true });
              input.dispatchEvent(inputEvent);

              // Try to find and click the submit button
              setTimeout(() => {
                const submitButton = containerRef.current?.querySelector('.ais-Chat-form button[type="submit"]') as HTMLButtonElement;
                if (submitButton) {
                  submitButton.click();
                }
              }, 100);
            }
          }, 300);
        }, 100);
      }
    };

    window.addEventListener('openAIAgent', handleOpenAIAgent as EventListener);

    return () => {
      window.removeEventListener('openAIAgent', handleOpenAIAgent as EventListener);
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
          max-width: 380px;
          width: 380px;
        }

        /* AI Agent Icon - show by default */
        .ais-Chat-trigger,
        [class*="Chat-trigger"] {
          display: flex !important;
          opacity: 1 !important;
          transition: opacity 0.3s ease;
        }

        /* Hide icon when cards are showing */
        .ais-Chat.has-tour-cards .ais-Chat-trigger,
        .ais-Chat.has-tour-cards [class*="Chat-trigger"] {
          display: none !important;
        }

        /* Show icon when cards are closed */
        .ais-Chat:not(.has-tour-cards) .ais-Chat-trigger,
        .ais-Chat:not(.has-tour-cards) [class*="Chat-trigger"] {
          display: flex !important;
        }

        /* Message styling */
        .ais-Chat-message {
          margin-bottom: 1rem;
        }

        /* Assistant messages containing cards */
        .ais-Chat-message--assistant .ais-Chat-message-content {
          background: transparent !important;
          padding: 0.5rem !important;
          min-height: auto !important;
        }

        .ais-Chat-message--assistant .ais-Chat-message-content.tour-cards-processed {
          background: transparent !important;
          padding: 0.5rem !important;
          display: block !important;
          visibility: visible !important;
        }

        /* Keep chat input and interface visible */
        .ais-Chat-input,
        .ais-Chat-form,
        [class*="Chat-input"],
        [class*="Chat-form"] {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
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
          pointer-events: auto !important;
          cursor: pointer !important;
          position: relative;
          z-index: 1;
        }

        .ais-Chat .tour-card-link * {
          pointer-events: none;
        }

        .ais-Chat .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

       /* Horizontal scrollbar for cards */
        .tour-cards-container {
          position: relative;
          z-index: 1;
        }

        /* Close button styling */
        .close-tour-cards {
          pointer-events: auto !important;
          cursor: pointer !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .close-tour-cards:hover {
          transform: scale(1.1);
        }

        /* Tour results wrapper */
        .tour-results-wrapper {
          background: transparent;
          padding: 0.5rem;
          border-radius: 0.5rem;
        }

        /* Animations */
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }

        .tour-cards-container > div {
          scrollbar-width: thin;
          scrollbar-color: #93c5fd transparent;
        }

        .tour-cards-container > div::-webkit-scrollbar {
          height: 4px;
        }

        .tour-cards-container > div::-webkit-scrollbar-track {
          background: transparent;
        }

        .tour-cards-container > div::-webkit-scrollbar-thumb {
          background: #93c5fd;
          border-radius: 2px;
        }

        .tour-cards-container > div::-webkit-scrollbar-thumb:hover {
          background: #60a5fa;
        }

        /* Vertical scrollbar for messages */
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