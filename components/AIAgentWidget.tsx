'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Minimize2 } from 'lucide-react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import { InstantSearch, Chat } from 'react-instantsearch';
import 'instantsearch.css/themes/satellite.css';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'WMDNV9WSOI';
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || 'f485b4906072cedbd2f51a46e5ac2637';
const AGENT_ID = 'fb2ac93a-1b89-40e2-a9cb-c85c1bbd978e';
const INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'foxes_technology';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

export default function AIAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-[9999]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-white" />
                <h3 className="text-white font-semibold text-sm">AI Assistant</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden">
              <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
                <Chat
                  agentId={AGENT_ID}
                  classNames={{
                    root: 'h-full ai-agent-chat',
                  }}
                  placeholder="Ask me anything..."
                />
              </InstantSearch>
            </div>

            {/* Styling */}
            <style jsx global>{`
              .ai-agent-chat {
                font-family: inherit !important;
                height: 100%;
                display: flex;
                flex-direction: column;
              }

              .ai-agent-chat .ais-Chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                font-size: 0.875rem;
              }

              .ai-agent-chat .ais-Chat-message {
                margin-bottom: 0.75rem;
              }

              .ai-agent-chat .ais-Chat-message--user {
                background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
                color: white !important;
                border-radius: 0.75rem 0.75rem 0.25rem 0.75rem !important;
                padding: 0.625rem 0.875rem !important;
                font-size: 0.875rem;
              }

              .ai-agent-chat .ais-Chat-message--assistant {
                background: #f1f5f9 !important;
                color: #1e293b !important;
                border-radius: 0.75rem 0.75rem 0.75rem 0.25rem !important;
                padding: 0.625rem 0.875rem !important;
                font-size: 0.875rem;
              }

              .ai-agent-chat .ais-Chat-inputWrapper {
                border: 1px solid #e2e8f0 !important;
                border-radius: 0.5rem !important;
                margin: 0.75rem;
                padding: 0.25rem !important;
              }

              .ai-agent-chat .ais-Chat-input {
                font-size: 0.875rem !important;
                padding: 0.5rem 0.75rem !important;
              }

              .ai-agent-chat .ais-Chat-button {
                background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
                color: white !important;
                border-radius: 0.5rem !important;
                padding: 0.5rem 0.875rem !important;
                font-size: 0.75rem !important;
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white z-[9999] hover:shadow-xl transition-shadow"
          aria-label="Open AI Assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}
    </>
  );
}
