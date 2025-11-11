'use client';

import { useState } from 'react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, useChat } from 'react-instantsearch';
import { MessageCircle, MapPin, Clock, DollarSign, Star, X, Send } from 'lucide-react';
import 'instantsearch.css/themes/satellite.css';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Tour Card Component
function TourCard({ tour }: { tour: any }) {
  return (
    <a
      href={`/tours/${tour.slug}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden group"
    >
      <div className="flex gap-3 p-3">
        {/* Tour Image */}
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          {tour.image || tour.images?.[0] || tour.primaryImage ? (
            <img
              src={tour.image || tour.images?.[0] || tour.primaryImage}
              alt={tour.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-blue-400" />
            </div>
          )}
        </div>

        {/* Tour Details */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors truncate">
            {tour.title}
          </h4>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
            {tour.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {tour.location}
              </span>
            )}
            {tour.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {tour.duration} days
              </span>
            )}
            {tour.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {tour.rating}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            {tour.discountPrice ? (
              <>
                <span className="text-base font-bold text-blue-600">
                  ${tour.discountPrice}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  ${tour.price}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-blue-600">
                ${tour.price}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

// Custom Chat Component with Card Rendering
function CustomChat() {
  const { messages, sendMessage } = useChat({
    agentId: AGENT_ID,
  });
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
sendMessage({ text: inputValue });      setInputValue('');
    }
  };

  const parseMessageContent = (content: string) => {
    try {
      // Try to parse JSON content
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return { type: 'tours', data: parsed };
      }
      return { type: 'text', data: content };
    } catch {
      // Check if content contains JSON-like structure
      if (content.includes('"title":') && content.includes('"slug":')) {
        // Extract tour objects from text
        const tourMatches = content.match(/\{[^}]+\}/g);
        if (tourMatches) {
          try {
            const tours = tourMatches.map(match => JSON.parse(match));
            return { type: 'tours', data: tours };
          } catch {
            return { type: 'text', data: content };
          }
        }
      }
      return { type: 'text', data: content };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium mb-1">Welcome to Egypt Tours Assistant!</p>
            <p className="text-xs">Ask me anything about tours, destinations, or activities.</p>
          </div>
        )}

        {messages.map((message, index) => {
          const parsedContent = message.role === 'assistant' 
            ? parseMessageContent(message.content)
            : { type: 'text', data: message.content };

          return (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'user' ? (
                <div className="max-w-[80%] bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                  {message.content}
                </div>
              ) : (
                <div className="max-w-[90%]">
                  {parsedContent.type === 'tours' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-600 mb-2">
                        Found {parsedContent.data.length} tours:
                      </div>
                      {parsedContent.data.slice(0, 5).map((tour: any, idx: number) => (
                        <TourCard key={idx} tour={tour} />
                      ))}
                      {parsedContent.data.length > 5 && (
                        <div className="text-xs text-gray-500 text-center mt-2">
                          + {parsedContent.data.length - 5} more tours
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
                      {parsedContent.data}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about tours, prices, destinations..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-[9999]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <h3 className="text-white font-semibold text-sm">AI Tour Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Content */}
          <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
            <CustomChat />
          </InstantSearch>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white z-[9999] hover:shadow-xl hover:scale-110 transition-all"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </>
  );
}