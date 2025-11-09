# Algolia AI Agent Integration

This document explains the Algolia AI Agent integration in the Egypt Excursions search system.

## Overview

The search page now features **two modes**:
1. **Browse Tours** - Traditional search with filters (categories, destinations, price, etc.)
2. **AI Assistant** - Natural language AI-powered search using Algolia Agent Studio

## Architecture

### Components

1. **AlgoliaChat Component** (`components/search/AlgoliaChat.tsx`)
   - Wraps the Algolia InstantSearch Chat widget
   - Uses Agent ID: `3b0e3cf3-58a7-4fec-82af-dcb12d10bd22`
   - Connects to 4 Algolia indices: `tours`, `destinations`, `categories`, `blogs`

2. **SearchClient Component** (`app/search/SearchClient.tsx`)
   - Main search page with mode switcher
   - Toggles between browse and AI modes
   - Dynamically loads AlgoliaChat component (client-side only)

### Algolia Indices

The AI agent searches across all indexed content:

| Index | Records | Content Type |
|-------|---------|--------------|
| `tours` | 182 | Tour listings with prices, locations, descriptions |
| `destinations` | 13 | Egypt destinations (Cairo, Luxor, etc.) |
| `categories` | 63 | Tour categories (Adventure, Cultural, etc.) |
| `blogs` | 1 | Blog posts and travel guides |

**Total searchable items:** 259

## Agent Configuration

### Agent Studio Settings

- **Agent ID:** `3b0e3cf3-58a7-4fec-82af-dcb12d10bd22`
- **API URL:** `https://1f31u1noms.algolia.net/agent-studio/1/agents/3b0e3cf3-58a7-4fec-82af-dcb12d10bd22/completions`
- **LLM:** Gemini 2.0 Flash (configured in Algolia dashboard)

### Search Capabilities

The AI agent can understand and process queries like:

**Natural Language Filters:**
- "tours under $100 in Cairo"
- "best family trips in Luxor"
- "sunset cruise with dinner"
- "romantic experiences in Aswan"
- "adventure activities under $50"

**Semantic Search:**
- Typo tolerance ("piramid" → finds "Pyramid")
- Context understanding (understands budget terms like "cheap", "affordable")
- Location matching (Cairo, Giza, Luxor, etc.)
- Activity recognition (cruise, diving, cultural, etc.)

## Environment Variables

Required environment variables in `.env`:

```bash
# Algolia Configuration
NEXT_PUBLIC_ALGOLIA_APP_ID=1F31U1NOMS
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=90dc77f33842e5ca1ad27ba3e42bbc50
ALGOLIA_WRITE_API_KEY=8b2d7e42d431be1ab91e5c196fce1ec7
```

## Automatic Syncing

All content is automatically synced to Algolia via Mongoose hooks:

```typescript
// On create/update (if published)
TourSchema.post('save', async function(doc) {
  if (doc.isPublished) {
    await syncTourToAlgolia(doc);
  }
});

// On delete
TourSchema.post('findOneAndDelete', async function(doc) {
  await deleteTourFromAlgolia(doc._id);
});
```

Same hooks exist for Destinations, Categories, and Blogs.

## Manual Syncing

To manually sync all data:

```bash
# Sync all entities (recommended)
npm run algolia:sync-all

# Sync only tours
npm run algolia:sync

# Clear and resync tours
npm run algolia:clear-sync
```

## Usage in Production

### Netlify Deployment

Add these environment variables to Netlify:

1. Go to Site Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_ALGOLIA_APP_ID`
   - `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY`
   - `ALGOLIA_WRITE_API_KEY`

### Costs

- **Algolia Search:** ~$1/1,000 searches (included in free tier: 10,000/mo)
- **LLM (Gemini):** Free tier available, then ~$0.001 per AI query
- **Total:** ~$10-20/month for 10,000 searches with AI

## Testing

Visit `/search` and click "AI Assistant" to test:

**Test Queries:**
1. "Show me cheap tours in Cairo"
2. "Family-friendly activities under $100"
3. "Best sunset cruises"
4. "Cultural tours in Luxor"
5. "What can I do in Giza?"

## Troubleshooting

**AI Chat not loading:**
- Check browser console for errors
- Verify Algolia credentials in `.env`
- Ensure Agent ID is correct in AlgoliaChat.tsx

**No search results:**
- Run `npm run algolia:sync-all` to sync data
- Check Algolia dashboard for index status
- Verify LLM is configured in Agent Studio

**Stale data:**
- Automatic syncing should handle updates
- If needed, manually run sync scripts
- Check Mongoose hooks are working (look for console logs)

## Future Enhancements

Potential improvements:
- [ ] Add voice input for AI queries
- [ ] Show AI confidence scores
- [ ] Add feedback mechanism (thumbs up/down)
- [ ] Track popular AI queries for insights
- [ ] Multi-language support
- [ ] Integration with booking flow

## Resources

- [Algolia Agent Studio Docs](https://www.algolia.com/doc/guides/ai-search/agent-studio/)
- [React InstantSearch Docs](https://www.algolia.com/doc/api-reference/widgets/react/)
- [Chat Widget Reference](https://www.algolia.com/doc/api-reference/widgets/chat/react/)
