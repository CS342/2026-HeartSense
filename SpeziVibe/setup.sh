#!/bin/bash
# Team Heart - SpeziVibe Setup Script
# Run this to scaffold the cross-platform app

echo "=== Team Heart SpeziVibe Setup ==="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js 20+ is required"
    echo "Install from: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js version: $(node -v)"

# Navigate to script directory
cd "$(dirname "$0")"

echo ""
echo "Creating SpeziVibe app..."
echo ""
echo "When prompted, select:"
echo "  • Backend: Medplum (recommended) or Firebase"
echo "  • Features: Chat, Scheduler, Questionnaire, Onboarding, HealthKit"
echo ""

# Create the app
npx create-spezivibe-app teamheart-app

if [ -d "teamheart-app" ]; then
    echo ""
    echo "=== Setup Complete ==="
    echo ""
    echo "Next steps:"
    echo "  cd teamheart-app"
    echo "  npx expo start"
    echo ""
    echo "For HealthKit (iOS):"
    echo "  npx expo run:ios"
    echo ""
else
    echo "Setup failed. Please try again."
    exit 1
fi
