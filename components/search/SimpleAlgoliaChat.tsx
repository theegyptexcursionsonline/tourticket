'use client';

import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat } from 'react-instantsearch';
import { AlertCircle } from 'lucide-react';
import 'instantsearch.css/themes/satellite.css';
import { useState, useEffect } from 'react';

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

export default function SimpleAlgoliaChat() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      }, 800);

      return () => clearTimeout(timer);
    }
  }, []);

  // Handle errors
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-medium">Configuration Error</p>
          <p className="text-xs text-red-600 mt-1">Check console for details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-slate-600 text-sm font-medium">Initializing AI...</p>
          </div>
        ) : (
          <div className="h-full">
            <Chat
              agentId={AGENT_ID}
              classNames={{
                root: 'h-full algolia-chat-simple',
              }}
              placeholder="Ask me about Egypt tours..."
            />
          </div>
        )}

        {/* Minimal CSS styling */}
        <style jsx global>{`
          .algolia-chat-simple {
            font-family: inherit !important;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .algolia-chat-simple .ais-Chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
          }

          .algolia-chat-simple .ais-Chat-message {
            margin-bottom: 0.75rem;
            animation: slideIn 0.2s ease-out;
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .algolia-chat-simple .ais-Chat-message--user {
            background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
            color: white !important;
            border-radius: 1rem 1rem 0.25rem 1rem !important;
            padding: 0.75rem 1rem !important;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2) !important;
            font-weight: 500;
          }

          .algolia-chat-simple .ais-Chat-message--assistant {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0) !important;
            color: #1e293b !important;
            border-radius: 1rem 1rem 1rem 0.25rem !important;
            padding: 0.75rem 1rem !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
            border: 1px solid #e2e8f0;
          }

          .algolia-chat-simple .ais-Chat-inputWrapper {
            border: 2px solid #e2e8f0 !important;
            border-radius: 0.75rem !important;
            background: white !important;
            padding: 0.375rem !important;
            transition: all 0.2s ease !important;
          }

          .algolia-chat-simple .ais-Chat-inputWrapper:focus-within {
            border-color: #2563eb !important;
            box-shadow: 0 2px 12px rgba(37, 99, 235, 0.15) !important;
          }

          .algolia-chat-simple .ais-Chat-input {
            font-size: 0.875rem !important;
            padding: 0.625rem 0.875rem !important;
            border: none !important;
          }

          .algolia-chat-simple .ais-Chat-button {
            background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
            color: white !important;
            border-radius: 0.625rem !important;
            padding: 0.5rem 1rem !important;
            font-weight: 600 !important;
            transition: all 0.2s ease !important;
            border: none !important;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3) !important;
          }

          .algolia-chat-simple .ais-Chat-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4) !important;
          }

          .algolia-chat-simple .ais-Chat-button:active {
            transform: translateY(0);
          }
        `}</style>
      </InstantSearch>
    </div>
  );
}
