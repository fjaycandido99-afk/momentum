#!/bin/bash
# Build and sync iOS app
set -e

echo "Building Next.js..."
npm run build

echo "Syncing with Capacitor (iOS)..."
npx cap sync ios

echo "Opening Xcode..."
npx cap open ios

echo "Done! Build and archive from Xcode."
