#!/bin/bash
# Upload Firebase service account to Cloudinary

# Your Cloudinary credentials (from .env file)
# Load from .env or set as environment variables before running this script
if [ -f .env ]; then
  export $(grep -E '^(CLOUDINARY_CLOUD_NAME|CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET)=' .env | xargs)
fi

CLOUD_NAME="${CLOUDINARY_CLOUD_NAME}"
API_KEY="${CLOUDINARY_API_KEY}"
API_SECRET="${CLOUDINARY_API_SECRET}"

# Check if credentials are set
if [ -z "$CLOUD_NAME" ] || [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
  echo "❌ Error: Cloudinary credentials not found"
  echo "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables"
  echo "Or make sure they exist in your .env file"
  exit 1
fi

# Load Firebase JSON from .env (base64) or from a local file
if [ -n "$FIREBASE_SERVICE_ACCOUNT_BASE64" ]; then
  # Use base64 from environment
  echo "📥 Using Firebase credentials from FIREBASE_SERVICE_ACCOUNT_BASE64"
  echo "$FIREBASE_SERVICE_ACCOUNT_BASE64" | base64 -d > /tmp/firebase-service-account.json
elif [ -f ".firebase/service-account.json" ]; then
  # Use local file
  echo "📥 Using Firebase credentials from .firebase/service-account.json"
  cp .firebase/service-account.json /tmp/firebase-service-account.json
else
  echo "❌ Error: Firebase service account not found"
  echo "Set FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable or create .firebase/service-account.json"
  exit 1
fi

echo "📤 Uploading to Cloudinary..."

# Generate timestamp and signature for authenticated upload
TIMESTAMP=$(date +%s)
PUBLIC_ID="config/firebase-service-account"

# Create signature string
STRING_TO_SIGN="public_id=${PUBLIC_ID}&timestamp=${TIMESTAMP}${API_SECRET}"
SIGNATURE=$(echo -n "$STRING_TO_SIGN" | openssl dgst -sha1 -hex | sed 's/^.* //')

# Upload to Cloudinary as raw file (signed)
RESPONSE=$(curl -s -X POST "https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload" \
  -F "file=@/tmp/firebase-service-account.json" \
  -F "public_id=${PUBLIC_ID}" \
  -F "timestamp=${TIMESTAMP}" \
  -F "api_key=${API_KEY}" \
  -F "signature=${SIGNATURE}")

# Extract URL from response
URL=$(echo $RESPONSE | grep -o '"secure_url":"[^"]*"' | cut -d'"' -f4)

if [ -z "$URL" ]; then
  echo "❌ Upload failed. Response:"
  echo "$RESPONSE"
  exit 1
fi

echo "✅ Upload successful!"
echo ""
echo "🔗 Your Firebase JSON URL:"
echo "$URL"
echo ""
echo "📋 Add this to Netlify environment variables:"
echo "FIREBASE_SERVICE_ACCOUNT_URL=$URL"
echo ""
echo "🗑️  Remove these from Netlify:"
echo "  - FIREBASE_SERVICE_ACCOUNT_BASE64"
echo "  - FIREBASE_PROJECT_ID"
echo "  - FIREBASE_CLIENT_EMAIL"
echo "  - FIREBASE_PRIVATE_KEY"

# Cleanup
rm /tmp/firebase-service-account.json
