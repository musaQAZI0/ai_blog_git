#!/bin/bash

# Script to deploy environment variables to Render using their CLI
# Install Render CLI first: https://render.com/docs/cli

# Your service ID - find this in your Render dashboard URL
SERVICE_ID="your-service-id"

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found!"
  exit 1
fi

echo "🚀 Deploying environment variables to Render..."

# Read .env.local and set each variable
# This excludes comments and empty lines
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  if [[ $key =~ ^#.*$ ]] || [[ -z $key ]]; then
    continue
  fi

  # Remove quotes from value if present
  value="${value%\"}"
  value="${value#\"}"

  echo "Setting $key..."
  render env set "$key" "$value" --service "$SERVICE_ID"
done < <(grep -v '^#' .env.local | grep -v '^$')

echo "✅ Done! Trigger a redeploy for changes to take effect."
echo "   Run: render deploy --service $SERVICE_ID"
