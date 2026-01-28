#!/bin/bash
echo "=== FIREBASE CREDENTIALS TEST ==="
echo ""
echo "Checking .env.local file..."
echo ""

# Source the .env.local file
if [ -f .env.local ]; then
    source .env.local
    
    echo "1. Client-side credentials (NEXT_PUBLIC_*):"
    echo "   NEXT_PUBLIC_FIREBASE_API_KEY: ${NEXT_PUBLIC_FIREBASE_API_KEY:0:30}..."
    echo "   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: $NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    echo "   NEXT_PUBLIC_FIREBASE_PROJECT_ID: $NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    echo "   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: $NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    echo "   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: $NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    echo "   NEXT_PUBLIC_FIREBASE_APP_ID: ${NEXT_PUBLIC_FIREBASE_APP_ID:0:40}..."
    echo ""
    
    echo "2. Server-side credentials (FIREBASE_ADMIN_*):"
    echo "   FIREBASE_ADMIN_PROJECT_ID: $FIREBASE_ADMIN_PROJECT_ID"
    echo "   FIREBASE_ADMIN_CLIENT_EMAIL: $FIREBASE_ADMIN_CLIENT_EMAIL"
    echo "   FIREBASE_ADMIN_PRIVATE_KEY: ${FIREBASE_ADMIN_PRIVATE_KEY:0:50}..."
    echo ""
    
    # Check if values match
    if [ "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" == "$FIREBASE_ADMIN_PROJECT_ID" ]; then
        echo "✅ Project IDs match: $NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    else
        echo "❌ Project IDs DON'T match!"
    fi
else
    echo "❌ .env.local file not found!"
fi
