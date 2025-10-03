# Complete Bulk Upload Guide

## Overview

The bulk upload feature now supports **100% of all Tour model fields** (74+ fields). You can now import tours with complete data including practical information, SEO fields, enhanced itineraries, booking options, and add-ons.

---

## How to Use

1. Navigate to **Admin Dashboard → Data Import** (`/admin/data-import`)
2. **Step 1**: Upload or paste your JSON data
   - Upload a `.json` file, or
   - Click "Load Sample Data" to see an example, or
   - Click "Download Sample" to get a template
3. **Step 2**: Upload images for destinations and tours
4. Click "Complete Import" to finalize

---

## Complete Field Support

### ✅ Basic Information (15 fields)
- `title` *(required)* - Tour title
- `slug` - URL-friendly identifier (auto-generated if not provided)
- `description` *(required)* - Short description
- `longDescription` - Detailed description
- `price` - Regular price
- `discountPrice` *(required)* - Current price
- `duration` *(required)* - Tour duration (e.g., "4 hours", "Full day")
- `maxGroupSize` - Maximum participants
- `difficulty` - Easy, Moderate, Challenging, or Difficult
- `location` - Physical location/address
- `meetingPoint` - Where to meet
- `languages` - Array of available languages
- `ageRestriction` - Age requirements
- `cancellationPolicy` - Cancellation terms
- `operatedBy` - Tour operator name

### ✅ Media (2 fields)
- `image` *(required)* - Main tour image URL
- `images` - Array of additional image URLs

### ✅ Lists & Arrays (5 fields)
- `highlights` - Tour highlights array
- `includes` - What's included (short form)
- `whatsIncluded` - Detailed inclusions array
- `whatsNotIncluded` - Exclusions array
- `tags` - SEO/categorization tags

### ✅ Practical Information (14 fields)
- `whatToBring` - Array of items to bring
- `whatToWear` - Clothing recommendations array
- `physicalRequirements` - Fitness level description
- `accessibilityInfo` - Array of accessibility details
- `groupSize` - Object: `{ "min": 1, "max": 8 }`
- `transportationDetails` - Transport information
- `mealInfo` - Meal details
- `weatherPolicy` - Weather-related policy
- `photoPolicy` - Photography rules
- `tipPolicy` - Gratuity guidelines
- `healthSafety` - Array of safety measures
- `culturalInfo` - Array of cultural highlights
- `seasonalVariations` - Seasonal information
- `localCustoms` - Array of local customs/etiquette

### ✅ SEO Fields (3 fields)
- `metaTitle` - SEO page title (max 60 chars)
- `metaDescription` - SEO description (max 160 chars)
- `keywords` - Array of SEO keywords

### ✅ Enhanced Itinerary (8 sub-fields per item)
```json
{
  "day": 1,
  "time": "09:00",
  "title": "Visit the Pyramids",
  "description": "Explore the ancient wonders",
  "duration": "2 hours",
  "location": "Giza Plateau",
  "includes": ["Entry ticket", "Guide"],
  "icon": "monument"
}
```

**Icon Options**: `location`, `transport`, `monument`, `camera`, `food`, `time`

### ✅ FAQs (2 sub-fields per item)
```json
{
  "question": "Is lunch included?",
  "answer": "Lunch is not included but recommendations are available."
}
```

### ✅ Booking Options (13 sub-fields per option)
```json
{
  "type": "Per Person",
  "label": "Standard Tour",
  "price": 69,
  "originalPrice": 89,
  "description": "Private tour with guide",
  "duration": "4 hours",
  "languages": ["English", "Arabic"],
  "highlights": ["Pyramid", "Sphinx"],
  "groupSize": "1-8 people",
  "difficulty": "Easy",
  "badge": "Popular",
  "discount": 22,
  "isRecommended": true
}
```

**Type Options**: `Per Person`, `Per Group`, `Per Couple`, `Per Family`

### ✅ Add-ons (4 sub-fields per add-on)
```json
{
  "name": "Camel Ride",
  "description": "30-minute camel ride",
  "price": 15,
  "category": "Experience"
}
```

**Category Options**: `Experience`, `Photography`, `Transport`, `Food & Drink`, `Equipment`

### ✅ Status & Metadata (4 fields)
- `featured` or `isFeatured` - Featured tour flag
- `isPublished` - Publication status (default: true)
- `destinationName` *(required)* - Must match existing destination
- `categoryNames` *(required)* - Array of category names

---

## JSON Structure

```json
{
  "wipeData": false,
  "updateMode": "upsert",
  "destinations": [
    {
      "name": "Cairo",
      "slug": "cairo",
      "image": "",
      "description": "Egypt's bustling capital"
    }
  ],
  "categories": [
    {
      "name": "Historical Tours",
      "slug": "historical"
    }
  ],
  "tours": [
    {
      // See full example in sample template
    }
  ]
}
```

### Update Modes
- **`insert`** - Only create new tours (skip existing)
- **`upsert`** - Create new or update existing tours
- **`replace`** - Replace all matching tours

### Wipe Data
- `"wipeData": false` - Keep existing data (default)
- `"wipeData": true` - Delete all tours/destinations/categories first ⚠️

---

## Example: Complete Tour

See the **sample template** in the Data Import page for a complete example with all 74 fields populated.

To download the sample:
1. Go to `/admin/data-import`
2. Click "Download Sample"
3. Review the JSON structure

---

## Field Validation

The API validates all fields according to the Tour model:

- **Required fields**: title, description, duration, discountPrice, destinationName, categoryNames
- **String limits**:
  - title: 5-200 chars
  - description: 20-1000 chars
  - metaTitle: max 60 chars
  - metaDescription: max 160 chars
- **Number ranges**:
  - prices: 0-999999
  - maxGroupSize: 1-1000
  - discount: 0-100%
- **Enums**:
  - difficulty: Easy, Moderate, Challenging, Difficult
  - bookingOption.type: Per Person, Per Group, Per Couple, Per Family
  - addOn.category: Experience, Photography, Transport, Food & Drink, Equipment
  - itinerary.icon: location, transport, monument, camera, food, time

---

## Tips & Best Practices

1. **Start with the sample** - Download and modify the sample template
2. **Test with small batches** - Import 1-2 tours first to verify structure
3. **Use updateMode: "upsert"** - Safely update existing tours
4. **Validate JSON** - Use a JSON validator before uploading
5. **Fill optional fields** - More data = better SEO and user experience
6. **Match existing data** - Ensure destinationName and categoryNames exist
7. **Upload images separately** - Step 2 allows image uploads per item

---

## Common Errors

| Error | Solution |
|-------|----------|
| "Destination not found" | Create destination first or fix name spelling |
| "Invalid JSON format" | Validate JSON syntax |
| "Missing required field" | Add title, description, duration, price, destination, category |
| "Duplicate slug" | Use unique slugs or enable upsert mode |
| "Price validation failed" | Ensure discountPrice ≤ originalPrice |

---

## Coverage Statistics

| Category | Fields | Status |
|----------|--------|--------|
| Basic Information | 15 | ✅ 100% |
| Media | 2 | ✅ 100% |
| Lists & Arrays | 5 | ✅ 100% |
| Practical Info | 14 | ✅ 100% |
| SEO | 3 | ✅ 100% |
| Itinerary (enhanced) | 8 sub-fields | ✅ 100% |
| Booking Options (enhanced) | 13 sub-fields | ✅ 100% |
| Add-ons (enhanced) | 4 sub-fields | ✅ 100% |
| Status & Metadata | 4 | ✅ 100% |
| **TOTAL** | **74+ fields** | **✅ 100%** |

---

## API Endpoint

**POST** `/api/admin/seed`

**Headers**: `Content-Type: application/json`

**Body**: JSON with destinations, categories, and tours

**Response**:
```json
{
  "success": true,
  "report": {
    "destinationsCreated": 1,
    "categoriesCreated": 1,
    "toursCreated": 1,
    "destinationsUpdated": 0,
    "categoriesUpdated": 0,
    "toursUpdated": 0,
    "errors": [],
    "warnings": []
  }
}
```

---

## Support

For issues or questions, check:
- Sample template in `/admin/data-import`
- Tour model: `/lib/models/Tour.ts`
- Type definitions: `/types/index.ts`
- API implementation: `/app/api/admin/seed/route.ts`
