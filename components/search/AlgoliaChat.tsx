'use client';

import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat } from 'react-instantsearch';
import 'instantsearch.css/themes/satellite.css';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '1F31U1NOMS';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || '90dc77f33842e5ca1ad27ba3e42bbc50';
const AGENT_ID = '3b0e3cf3-58a7-4fec-82af-dcb12d10bd22';
const INDEX_NAME = 'tours';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

interface AlgoliaChatProps {
  initialQuery?: string;
}

export default function AlgoliaChat({ initialQuery }: AlgoliaChatProps) {
  // Log configuration for debugging
  if (typeof window !== 'undefined') {
    console.log('Algolia Chat Configuration:', {
      appId: ALGOLIA_APP_ID,
      agentId: AGENT_ID,
      indexName: INDEX_NAME,
      hasSearchKey: !!ALGOLIA_SEARCH_KEY
    });
  }

  return (
    <div className="w-full">
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Travel Assistant</h2>
                <p className="text-red-100 text-sm">Powered by Algolia AI</p>
              </div>
            </div>
            <p className="text-white/90">
              Ask me anything about Egypt tours! I can help you find tours by location, price, activities, and more.
            </p>
          </div>

          {/* Chat Interface */}
          <div className="p-6">
            {initialQuery && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">Your query:</span> {initialQuery}
                </p>
                <p className="text-xs text-red-600 mt-1">Type this into the chat below to search</p>
              </div>
            )}

            {/* Important Note */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>💡 Tip:</strong> Make sure the Agent ID ({AGENT_ID}) is configured in your{' '}
                <a
                  href="https://www.algolia.com/account/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  Algolia Agent Studio
                </a>{' '}
                and connected to the &quot;{INDEX_NAME}&quot; index.
              </p>
            </div>

            <Chat
              agentId={AGENT_ID}
              placeholder={initialQuery || "Type your question here... (e.g., 'Find romantic sunset cruises in Cairo')"}
              classNames={{
                root: 'min-h-[500px]',
              }}
            />
          </div>
        </div>
      </InstantSearch>
    </div>
  );
}
