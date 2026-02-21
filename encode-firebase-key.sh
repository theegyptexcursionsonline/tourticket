#!/bin/bash
# Helper script to encode Firebase service account to base64

if [ -z "$1" ]; then
  echo "Usage: ./encode-firebase-key.sh /path/to/service-account.json"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "Error: File not found: $1"
  exit 1
fi

echo "Encoding Firebase service account to base64..."
echo ""
echo "Add this to your Netlify environment variables:"
echo "FIREBASE_SERVICE_ACCOUNT_BASE64="
cat "$1" | base64
echo ""
echo "Done! Copy the value above (everything after the = sign)"
