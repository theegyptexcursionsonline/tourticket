#!/bin/bash

# Cloudflare Image Optimization Setup Script
# Domain: egypt-excursionsonline.com
# Zone ID: 31d54dcc6b58753e7184a2f8d6213a9e

echo "🚀 Cloudflare Image Optimization Setup"
echo "======================================="
echo ""

# Check if API token is provided
if [ -z "$1" ]; then
    echo "❌ Error: Cloudflare API Token required"
    echo ""
    echo "Usage: ./setup-cloudflare-images.sh YOUR_API_TOKEN"
    echo ""
    echo "Get your API token from:"
    echo "https://dash.cloudflare.com/profile/api-tokens"
    echo ""
    echo "Required permissions:"
    echo "  - Zone.Zone Settings (Edit)"
    echo "  - Zone.Transform Rules (Edit)"
    exit 1
fi

API_TOKEN="$1"
ZONE_ID="31d54dcc6b58753e7184a2f8d6213a9e"
DOMAIN="egypt-excursionsonline.com"

echo "Domain: $DOMAIN"
echo "Zone ID: $ZONE_ID"
echo ""

# Step 1: Enable Image Resizing
echo "📝 Step 1: Enabling Image Resizing..."
RESPONSE=$(curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/image_resizing" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}')

SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
    echo "✅ Image Resizing enabled successfully"
else
    echo "❌ Failed to enable Image Resizing"
    echo "Response: $RESPONSE"
fi
echo ""

# Step 2: Configure Polish (lossless compression)
echo "📝 Step 2: Configuring Polish (image compression)..."
RESPONSE=$(curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/polish" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"lossy"}')

SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
    echo "✅ Polish configured successfully (lossy mode)"
else
    echo "❌ Failed to configure Polish"
    echo "Response: $RESPONSE"
fi
echo ""

# Step 3: Enable WebP
echo "📝 Step 3: Enabling WebP..."
RESPONSE=$(curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/webp" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}')

SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
    echo "✅ WebP enabled successfully"
else
    echo "❌ Failed to enable WebP"
    echo "Response: $RESPONSE"
fi
echo ""

# Step 4: Configure Allowed Origins
echo "📝 Step 4: Configuring allowed origins..."
RESPONSE=$(curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/transformations" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{
    \"value\": {
      \"allowed_origins\": [
        \"$DOMAIN\",
        \"www.$DOMAIN\",
        \"egypt-excursionsonline.com\",
        \"theegyptexcursionsonline.netlify.app\"
      ]
    }
  }")

SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true')
if [ -n "$SUCCESS" ]; then
    echo "✅ Allowed origins configured successfully"
else
    echo "⚠️  Warning: Could not configure allowed origins"
    echo "You may need to configure this manually in the dashboard"
    echo "Response: $RESPONSE"
fi
echo ""

# Step 5: Verify Configuration
echo "📝 Step 5: Verifying configuration..."
echo ""

# Get Image Resizing status
RESIZE_STATUS=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/image_resizing" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json")

echo "Image Resizing: $(echo "$RESIZE_STATUS" | grep -o '"value":"[^"]*"' | head -1)"

# Get Polish status
POLISH_STATUS=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/polish" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json")

echo "Polish: $(echo "$POLISH_STATUS" | grep -o '"value":"[^"]*"' | head -1)"

# Get WebP status
WEBP_STATUS=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/webp" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json")

echo "WebP: $(echo "$WEBP_STATUS" | grep -o '"value":"[^"]*"' | head -1)"
echo ""

# Final instructions
echo "======================================="
echo "✅ Setup Complete!"
echo "======================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Deploy your application with production environment variables"
echo "2. Test an optimized image URL:"
echo "   https://$DOMAIN/cdn-cgi/image/width=1920,quality=85,format=auto/hero2.jpg"
echo ""
echo "3. Check if WebP/AVIF is being served:"
echo "   curl -I -H 'Accept: image/webp' https://$DOMAIN/cdn-cgi/image/width=1920,format=auto/hero2.jpg"
echo ""
echo "4. Monitor performance in Cloudflare Dashboard:"
echo "   https://dash.cloudflare.com/ → Your Zone → Analytics → Image Optimization"
echo ""
echo "5. Test PageSpeed Insights:"
echo "   https://pagespeed.web.dev/?url=https://$DOMAIN"
echo ""
echo "Need help? Check CLOUDFLARE_IMAGE_SETUP.md for detailed documentation"
echo ""
