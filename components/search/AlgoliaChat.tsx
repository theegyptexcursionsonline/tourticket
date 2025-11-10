'use client';

import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat } from 'react-instantsearch';
import { Sparkles, MessageCircle, Zap, Shield, Globe2, AlertCircle, ArrowRight } from 'lucide-react';
import 'instantsearch.css/themes/satellite.css';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import fallback search
const FallbackSearch = dynamic(() => import('./FallbackSearch'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>,
});

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '1F31U1NOMS';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || '90dc77f33842e5ca1ad27ba3e42bbc50';
const AGENT_ID = '3b0e3cf3-58a7-4fec-82af-dcb12d10bd22';
const INDEX_NAME = 'tours';

// Create search client with error handling
const createSearchClient = () => {
  try {
    return algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  } catch (error) {
    console.error('Failed to create Algolia search client:', error);
    throw error;
  }
};

const searchClient = createSearchClient();

interface AlgoliaChatProps {
  initialQuery?: string;
}

export default function AlgoliaChat({ initialQuery }: AlgoliaChatProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  // Log configuration for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Algolia Chat Configuration:', {
        appId: ALGOLIA_APP_ID,
        agentId: AGENT_ID,
        indexName: INDEX_NAME,
        hasSearchKey: !!ALGOLIA_SEARCH_KEY
      });

      // Verify credentials
      if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
        setError('Algolia credentials are missing. Please check your environment variables.');
        setIsLoading(false);
        return;
      }

      // Mark as loaded after a short delay
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Handle errors
  if (error) {
    return (
      <div className="w-full p-8 bg-red-50 border-2 border-red-200 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="bg-red-500 p-3 rounded-full">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Configuration Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <p className="text-sm text-red-600">
              Please contact support or check the{' '}
              <a href="/ALGOLIA_AGENT_TROUBLESHOOTING.md" className="underline font-semibold">
                troubleshooting guide
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Use fallback search if requested
  if (useFallback) {
    return (
      <div className="w-full">
        <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-900 font-semibold mb-1">Using Standard Search</p>
              <p className="text-xs text-amber-700">AI Chat will be available once the agent is configured.</p>
            </div>
            <button
              onClick={() => setUseFallback(false)}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all"
            >
              Try AI Chat Again
            </button>
          </div>
        </div>
        <FallbackSearch initialQuery={initialQuery} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        <div className="bg-gradient-to-br from-white via-red-50/30 to-orange-50/30 rounded-2xl shadow-2xl border border-red-100 overflow-hidden backdrop-blur-sm">
          {/* Enhanced Header with Gradient and Icons */}
          <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-orange-500 p-8 text-white overflow-hidden">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg">
                    <Sparkles className="w-10 h-10 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold mb-1 flex items-center gap-2">
                      AI Travel Assistant
                      <span className="inline-block">
                        <Zap className="w-6 h-6 text-yellow-300 animate-pulse" />
                      </span>
                    </h2>
                    <p className="text-red-100 text-sm font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Powered by Algolia AI
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Natural Language</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                  <Globe2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Egypt Tours</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Instant Results</span>
                </div>
              </div>

              <p className="text-white/95 text-base leading-relaxed max-w-3xl">
                Ask me anything about Egypt tours! I can help you discover amazing experiences by location,
                price range, activities, and much more. Try asking in your own words.
              </p>
            </div>
          </div>

          {/* Chat Interface with Enhanced Styling */}
          <div className="p-6 bg-gradient-to-b from-white to-slate-50/50">
            {initialQuery && (
              <div className="mb-5 p-5 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-xl shadow-sm">
                <p className="text-sm text-red-900 font-medium mb-1">
                  <span className="font-bold">Your query:</span> {initialQuery}
                </p>
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Type this into the chat below to search
                </p>
              </div>
            )}

            {/* Pro Tips Section */}
            <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-semibold mb-1">Pro Tips for Best Results</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Be specific about your preferences (e.g., budget, duration, activities)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Ask follow-up questions to refine your search</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>Try different phrasings if you don&apos;t find what you&apos;re looking for</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Enhanced Chat Component */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-100/20 to-orange-100/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
                {isLoading ? (
                  <div className="min-h-[500px] flex flex-col items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                    <p className="text-slate-600 font-medium">Initializing AI Assistant...</p>
                  </div>
                ) : (
                  <Chat
                    agentId={AGENT_ID}
                    classNames={{
                      root: 'min-h-[500px] algolia-chat-enhanced',
                    }}
                    placeholder="Type your question here... (e.g., 'Find romantic sunset cruises in Cairo')"
                  />
                )}
              </div>
            </div>

            {/* Help Footer */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs text-slate-600 text-center">
                <span className="font-semibold">Need help?</span> This AI assistant is connected to our live tour database.
                All recommendations are based on real, bookable tours.
              </p>
            </div>

            {/* Troubleshooting Info */}
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-blue-700 mb-2">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    <span className="font-semibold">AI not responding?</span> The agent may need configuration in Algolia Dashboard.
                  </p>
                  <button
                    onClick={() => setUseFallback(true)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:gap-2 transition-all underline"
                  >
                    Use Standard Search Instead
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom CSS for enhanced chat styling */}
        <style jsx global>{`
          .algolia-chat-enhanced {
            font-family: inherit !important;
          }

          .algolia-chat-enhanced .ais-Chat-messages {
            padding: 1.5rem;
            background: linear-gradient(to bottom, transparent, rgba(248, 250, 252, 0.5));
          }

          .algolia-chat-enhanced .ais-Chat-message {
            margin-bottom: 1rem;
            animation: slideIn 0.3s ease-out;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .algolia-chat-enhanced .ais-Chat-message--user {
            background: linear-gradient(135deg, #dc2626, #ea580c) !important;
            color: white !important;
            border-radius: 1.25rem 1.25rem 0.25rem 1.25rem !important;
            padding: 0.875rem 1.25rem !important;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2) !important;
            font-weight: 500;
          }

          .algolia-chat-enhanced .ais-Chat-message--assistant {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0) !important;
            color: #1e293b !important;
            border-radius: 1.25rem 1.25rem 1.25rem 0.25rem !important;
            padding: 0.875rem 1.25rem !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
            border: 1px solid #e2e8f0;
          }

          .algolia-chat-enhanced .ais-Chat-inputWrapper {
            border: 2px solid #e2e8f0 !important;
            border-radius: 1rem !important;
            background: white !important;
            padding: 0.5rem !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
          }

          .algolia-chat-enhanced .ais-Chat-inputWrapper:focus-within {
            border-color: #dc2626 !important;
            box-shadow: 0 4px 16px rgba(220, 38, 38, 0.15) !important;
          }

          .algolia-chat-enhanced .ais-Chat-input {
            font-size: 0.95rem !important;
            padding: 0.75rem 1rem !important;
            border: none !important;
          }

          .algolia-chat-enhanced .ais-Chat-button {
            background: linear-gradient(135deg, #dc2626, #ea580c) !important;
            color: white !important;
            border-radius: 0.75rem !important;
            padding: 0.625rem 1.25rem !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
            border: none !important;
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3) !important;
          }

          .algolia-chat-enhanced .ais-Chat-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4) !important;
          }

          .algolia-chat-enhanced .ais-Chat-button:active {
            transform: translateY(0);
          }
        `}</style>
      </InstantSearch>
    </div>
  );
}
