#!/bin/bash
set -e

echo "=========================================="
echo "  Building Inventory App (Capacitor)"
echo "=========================================="

# Step 1: Create project structure
mkdir -p inventory-app
mkdir -p inventory-app/www

# Step 2: Copy web files
cp -r *.html inventory-app/www/
cp -r *.js inventory-app/www/
cp -r *.css inventory-app/www/
cp -r js inventory-app/www/ 2>/dev/null || true
cp -r css inventory-app/www/ 2>/dev/null || true
cp -r assets inventory-app/www/ 2>/dev/null || true
cp -r images inventory-app/www/ 2>/dev/null || true

# Step 3: Create package.json for Capacitor
cat > inventory-app/package.json << 'EOF'
{
  "name": "inventory-app",
  "version": "1.0.0",
  "description": "نظام إدارة العهد والأصناف والجهات",
  "main": "index.js",
  "scripts": {
    "build": "echo 'Static files ready'",
    "sync": "npx cap sync",
    "android": "npx cap open android",
    "ios": "npx cap open ios"
  },
  "dependencies": {
    "@capacitor/android": "^6.0.0",
    "@capacitor/core": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor/camera": "^6.0.0",
    "@capacitor/filesystem": "^6.0.0",
    "@capacitor/share": "^6.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.0.0"
  }
}
EOF

# Step 4: Create capacitor.config.json
cat > inventory-app/capacitor.config.json << 'EOF'
{
  "appId": "com.yourcompany.inventory",
  "appName": "نظام العهد",
  "webDir": "www",
  "bundledWebRuntime": false,
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#2563eb"
    }
  },
  "android": {
    "buildOptions": {
      "keystorePath": "",
      "keystoreAlias": "",
      "keystorePassword": "",
      "keystoreAliasPassword": ""
    }
  }
}
EOF

# Step 5: Install dependencies and add platforms
cd inventory-app

npm install

# Add Android platform
npx cap add android

# Add iOS platform (only on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  npx cap add ios
fi

# Sync web assets to native projects
npx cap sync

echo ""
echo "=========================================="
echo "  Build Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. cd inventory-app/android"
echo "  2. ./gradlew assembleRelease"
echo ""
echo "Or open in Android Studio:"
echo "  npx cap open android"
echo ""
