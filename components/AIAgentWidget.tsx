'use client';

import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat } from 'react-instantsearch';
import 'instantsearch.css/themes/satellite.css';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

export default function AIAgentWidget() {
  return (
    <div className="hidden md:block fixed bottom-6 left-6 z-[45]">
      <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
        <Chat agentId={AGENT_ID} />
      </InstantSearch>

      {/* Minimal styling to ensure proper display */}
      <style jsx global>{`
        /* Let Algolia's native chat component handle all UI */
        .ais-Chat {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}