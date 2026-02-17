#!/bin/bash
# Build and sync Android app
set -e

echo "Building Next.js..."
npm run build

echo "Syncing with Capacitor (Android)..."
npx cap sync android

echo "Opening Android Studio..."
npx cap open android

echo "Done! Build and sign from Android Studio."
