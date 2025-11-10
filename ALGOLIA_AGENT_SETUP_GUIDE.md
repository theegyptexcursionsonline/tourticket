# Algolia AI Agent Setup Guide

## Critical Issue: Agent Configuration Required

The AI Search is not working because the **Algolia Agent needs to be properly configured in Algolia Dashboard**. This is the most common issue when the Chat component loads but doesn't respond to queries.

---

## Step-by-Step Agent Configuration

### Step 1: Access Algolia Dashboard

1. Go to [Algolia Dashboard](https://www.algolia.com/account/)
2. Log in with your credentials
3. Select your application: **App ID: 1F31U1NOMS**

### Step 2: Navigate to Agent Studio

1. In the left sidebar, click on **"AI"**
2. Select **"Agent Studio"** from the dropdown
3. You should see a list of agents or an option to create one

### Step 3: Check Existing Agent

Look for the agent with ID: **3b0e3cf3-58a7-4fec-82af-dcb12d10bd22**

**If the agent exists:**
- Check its status (should be "Published" or "Active")
- Verify it's connected to the indices
- Go to Step 4 to verify configuration

**If the agent doesn't exist:**
- You need to create a new one (go to Step 4)

### Step 4: Create/Configure AI Agent

#### 4.1 Basic Information

- **Name**: AI Travel Assistant
- **Description**: Helps users find tours, destinations, and activities in Egypt using natural language

#### 4.2 Connect to Indices

Connect the agent to these indices:
- ✅ **tours** (primary - 182 records)
- ✅ **destinations** (13 records)
- ✅ **categories** (63 records)
- ✅ **blogs** (1 record)

#### 4.3 Configure System Prompt

Add this system prompt to guide the agent's behavior:

```
You are a helpful AI travel assistant specializing in Egypt tours and travel experiences.

Your role:
- Help users discover tours, destinations, and activities in Egypt
- Provide personalized recommendations based on their preferences
- Answer questions about tours, prices, durations, and locations
- Suggest relevant alternatives if exact matches aren't available

Guidelines:
- Be friendly, helpful, and enthusiastic about Egypt travel
- Always mention specific tour names, prices, and key details
- Highlight unique features and value propositions
- If asked about budget, provide options in different price ranges
- Include location information (Cairo, Luxor, Hurghada, etc.)
- Mention tour duration when relevant

Data available:
- Tours: Title, description, price, location, duration, rating, category, highlights
- Destinations: Names, descriptions, highlights, things to do
- Categories: Tour types (adventure, cultural, luxury, family, etc.)

Always provide accurate information from the search results and be honest if you don't find matching tours.
```

#### 4.4 Configure Response Format

Set up how results should be displayed:

1. **Result Template**: Configure to show tour cards with:
   - Tour title
   - Image (if available)
   - Price
   - Rating
   - Duration
   - Quick booking link

2. **Attributes to Display**:
   ```json
   {
     "title": true,
     "description": true,
     "price": true,
     "discountPrice": true,
     "location": true,
     "duration": true,
     "rating": true,
     "image": true,
     "highlights": true,
     "category": true,
     "destination": true
   }
   ```

#### 4.5 Search Configuration

Configure search behavior:

- **Searchable Attributes** (in order of importance):
  1. title
  2. description
  3. location
  4. _tags
  5. category.name
  6. destination.name

- **Filters**: Enable filtering by:
  - Price range
  - Rating
  - Duration
  - Category
  - Destination
  - Featured status

- **Faceting**: Enable faceted search for:
  - Categories
  - Destinations
  - Price ranges
  - Duration ranges

#### 4.6 Fallback Responses

Configure fallback messages:

- **No results found**: "I couldn't find tours matching your exact criteria. Would you like me to show you similar tours or adjust your search?"
- **Clarification needed**: "Could you provide more details about what you're looking for? For example, budget range, preferred location, or type of experience?"
- **Error**: "I'm having trouble processing your request right now. Please try rephrasing your question or contact support."

### Step 5: Test the Agent

1. In Agent Studio, use the **Test** feature
2. Try these sample queries:

   ```
   - Find family tours in Cairo under $100
   - Show me romantic sunset cruises
   - What are the best luxury tours in Luxor?
   - Beach tours in Hurghada
   - 3-day historical tours of the pyramids
   ```

3. Verify that:
   - ✅ Agent responds to queries
   - ✅ Results are relevant
   - ✅ Tour details are displayed correctly
   - ✅ Prices and ratings appear

### Step 6: Publish the Agent

1. Click **"Publish"** or **"Deploy"**
2. Confirm the agent is **Active**
3. Copy the Agent ID (should be: `3b0e3cf3-58a7-4fec-82af-dcb12d10bd22`)

### Step 7: Verify API Key Permissions

1. Go to **Settings** > **API Keys**
2. Find your Search API Key: `90dc77f33842e5ca1ad27ba3e42bbc50`
3. Verify it has these permissions:
   - ✅ Search
   - ✅ Browse
   - ✅ Agent access (if available)

4. Check allowed indices:
   - ✅ tours
   - ✅ destinations
   - ✅ categories
   - ✅ blogs

---

## Alternative: Create New Agent

If you prefer to create a completely new agent:

1. In Agent Studio, click **"Create Agent"**
2. Follow Steps 4.1 through 4.6 above
3. After publishing, copy the new Agent ID
4. Update the Agent ID in the code:

   Edit `/components/search/AlgoliaChat.tsx`:
   ```typescript
   const AGENT_ID = 'YOUR_NEW_AGENT_ID_HERE';
   ```

---

## Troubleshooting After Setup

### Agent appears but doesn't respond

**Cause**: Agent might be in Draft mode
**Solution**: Click "Publish" in Agent Studio

### Agent responds but gives irrelevant results

**Cause**: System prompt or search configuration needs tuning
**Solution**:
1. Refine the system prompt
2. Adjust searchable attributes order
3. Enable more faceting options

### Agent returns errors

**Cause**: Index configuration or permissions issue
**Solution**:
1. Verify indices have data (run `npm run algolia:sync-all`)
2. Check API key permissions
3. Review browser console for specific error messages

### Chat loads but input doesn't work

**Cause**: Agent not connected to correct indices
**Solution**: Re-connect agent to all 4 indices in Step 4.2

---

## Verification Checklist

Before testing in your application, verify:

- [ ] Agent is Published/Active in Agent Studio
- [ ] Agent is connected to: tours, destinations, categories, blogs
- [ ] System prompt is configured
- [ ] Response format is set up
- [ ] Test queries work in Agent Studio
- [ ] API key has proper permissions
- [ ] Indices contain data (259 total records)

---

## Testing in Your Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open the application**: http://localhost:3000

3. **Click the AI Assistant button** (red floating button)

4. **Try a test query**: "Find family tours in Cairo"

5. **Check browser console** (F12):
   - Look for "Algolia Chat Configuration" log
   - Check for any error messages
   - Verify agent ID matches

6. **If still not working**:
   - Open browser Network tab
   - Look for requests to `algolia.net`
   - Check response status codes
   - Review error messages

---

## Support Resources

- **Algolia Agent Studio Docs**: https://www.algolia.com/doc/guides/ai-search/agent-studio/
- **Algolia Support**: https://support.algolia.com
- **React InstantSearch Docs**: https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/react/

---

## Quick Fix

If you need the search to work immediately, you can use the fallback standard search:

1. The application will automatically fall back to MongoDB + Fuse.js fuzzy search
2. API endpoint: `/api/search/tours`
3. This doesn't require Algolia Agent configuration

However, the AI-powered natural language search requires proper Agent Studio setup.

---

## Need Help?

If you're still experiencing issues after following this guide:

1. Take screenshots of:
   - Agent Studio configuration
   - Browser console errors
   - Network tab showing Algolia requests

2. Check these files:
   - `components/search/AlgoliaChat.tsx`
   - `.env` (Algolia credentials)
   - `ALGOLIA_AGENT_TROUBLESHOOTING.md`

3. Contact Algolia support with:
   - App ID: 1F31U1NOMS
   - Agent ID: 3b0e3cf3-58a7-4fec-82af-dcb12d10bd22
   - Error messages
   - Screenshots

---

**Last Updated**: 2025-11-10
**Status**: Agent requires configuration in Algolia Dashboard
