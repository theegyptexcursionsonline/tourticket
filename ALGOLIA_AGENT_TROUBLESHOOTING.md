# Algolia AI Agent Troubleshooting Guide

## Problem: AI Chat Not Finding Results

If the AI assistant is not finding any results when you type queries, follow these steps:

### 1. Verify Agent Configuration in Algolia Dashboard

1. Go to [Algolia Dashboard](https://www.algolia.com/account/)
2. Navigate to **Agent Studio** (AI > Agent Studio)
3. Find your agent with ID: `3b0e3cf3-58a7-4fec-82af-dcb12d10bd22`

### 2. Check Agent Configuration

Ensure your agent is configured with:

- **Index**: Connected to `tours` index
- **Status**: Agent should be **Active** or **Published**
- **Permissions**: Verify the Search API Key has access to the agent

### 3. Verify Index Configuration

1. Go to **Search** > **Index** > **tours**
2. Confirm you have data in the index:
   - 182 tours
   - 13 destinations
   - 63 categories
   - 1 blog post

### 4. Test Agent Directly in Agent Studio

1. Open Agent Studio in Algolia Dashboard
2. Test queries directly in the studio interface
3. Try example queries:
   - "Find family tours in Cairo under $100"
   - "Show romantic sunset cruises"
   - "Beach tours in Hurghada"

### 5. Check API Keys

Verify in your `.env` file:

```bash
NEXT_PUBLIC_ALGOLIA_APP_ID=1F31U1NOMS
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=90dc77f33842e5ca1ad27ba3e42bbc50
```

### 6. Common Issues

#### Agent Not Responding
- **Solution**: Make sure the agent is published/deployed in Agent Studio
- The agent might be in "Draft" mode

#### No Search Results
- **Solution**: Verify the agent is connected to the correct index (`tours`)
- Check if your agent has "Search" permissions enabled

#### Agent Configuration Error
- **Solution**: The agent might need additional configuration in Agent Studio:
  - Set up response templates
  - Configure search parameters
  - Add fallback responses

### 7. Browser Console Debugging

Open browser Developer Tools (F12) and check the Console for:

```javascript
Algolia Chat Configuration: {
  appId: "1F31U1NOMS",
  agentId: "3b0e3cf3-58a7-4fec-82af-dcb12d10bd22",
  indexName: "tours",
  hasSearchKey: true
}
```

Look for any error messages related to:
- Network errors
- Authentication errors
- Agent configuration errors

### 8. Agent Studio Configuration Steps

If your agent is not configured, follow these steps in Algolia Agent Studio:

1. **Create/Edit Agent**:
   - Name: AI Travel Assistant
   - Description: Helps users find tours in Egypt

2. **Connect to Index**:
   - Select index: `tours`
   - Enable search on: title, description, location, category, destination

3. **Configure Responses**:
   - Set response format to include tour cards
   - Configure result templates
   - Add relevant fields: title, slug, image, price, rating

4. **Set Up Prompts**:
   - System prompt: "You are a helpful travel assistant specializing in Egypt tours..."
   - Context: Include tour details, pricing, locations

5. **Test & Publish**:
   - Test with sample queries
   - Publish the agent to make it live

### 9. Alternative: Test with Default Agent

If issues persist, try testing with a default Algolia agent:

1. Create a new agent in Agent Studio
2. Use default settings
3. Update `AGENT_ID` in `components/search/AlgoliaChat.tsx`

### 10. Contact Algolia Support

If none of the above works:

1. Contact Algolia Support: [support.algolia.com](https://support.algolia.com)
2. Provide:
   - App ID: `1F31U1NOMS`
   - Agent ID: `3b0e3cf3-58a7-4fec-82af-dcb12d10bd22`
   - Index name: `tours`
   - Error messages from browser console

---

## Quick Test

Run this command to verify your Algolia data is synced:

```bash
npm run algolia:sync-all
```

This should show:
```
✅ Synced 182 tours
✅ Synced 13 destinations
✅ Synced 63 categories
✅ Synced 1 blog posts
```

---

## Need Help?

The most common issue is that the Agent needs to be properly configured and published in Algolia's Agent Studio dashboard. Make sure to:

1. ✅ Agent is published/active
2. ✅ Agent is connected to the "tours" index
3. ✅ Search API key has proper permissions
4. ✅ Index contains data (run sync command above)
