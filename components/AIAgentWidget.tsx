'use client';

import { useEffect } from 'react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import 'instantsearch.css/themes/satellite.css';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

export default function AIAgentWidget() {
  useEffect(() => {
    // Load Algolia's AI Agent script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@algolia/recommend@5/dist/recommend.umd.js';
    script.async = true;
    
    script.onload = () => {
      // Initialize Algolia AI Agent with native UI
      if (window.AlgoliaAgent) {
        window.AlgoliaAgent.init({
          appId: ALGOLIA_APP_ID,
          apiKey: ALGOLIA_SEARCH_KEY,
          agentId: AGENT_ID,
          indexName: INDEX_NAME,
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null; // No custom UI needed - Algolia handles everything
}

declare global {
  interface Window {
    AlgoliaAgent?: any;
  }
}