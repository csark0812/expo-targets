#!/bin/bash

# Build Test Suite Runner
# Runs all build tests in sequence

set -e

echo "================================================"
echo "   expo-targets Build Test Suite"
echo "================================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEST_DIR="$(dirname "$SCRIPT_DIR")"

cd "$TEST_DIR"

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

echo "🧪 Running Prebuild Tests..."
echo "================================================"
npm run test:prebuild
echo ""

echo "🔨 Running Compilation Tests..."
echo "================================================"
npm run test:compile
echo ""

echo "🚀 Running Runtime Tests..."
echo "================================================"
npm run test:runtime
echo ""

echo "================================================"
echo "✅ All tests completed!"
echo "================================================"

