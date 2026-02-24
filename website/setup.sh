#!/bin/bash

# MO Receiver - Setup Script
# This script will help you set up the MO Receiver Website

echo "=========================================="
echo "  MO Receiver - Automated Setup Script  "
echo "=========================================="
echo ""

# Check if Node.js is installed
echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION is installed"
echo ""

# Check if npm is installed
echo "🔍 Checking npm installation..."
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm $NPM_VERSION is installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies!"
    exit 1
fi
echo ""

# Create public directory if not exists
if [ ! -d "public" ]; then
    echo "📁 Creating public directory..."
    mkdir -p public
    echo "✅ Public directory created"
else
    echo "✅ Public directory already exists"
fi
echo ""

# Check if port 4001 is available
echo "🔍 Checking if port 4001 is available..."
if lsof -Pi :4001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Warning: Port 4001 is already in use!"
    echo "You can use a different port by running: PORT=8080 npm start"
else
    echo "✅ Port 4001 is available"
fi
echo ""

echo "=========================================="
echo "  ✅ Setup Complete!                     "
echo "=========================================="
echo ""
echo "🚀 To start the server, run:"
echo "   npm start"
echo ""
echo "🌐 Then open your browser and visit:"
echo "   http://localhost:4001 (local)"
echo "   http://YOUR_VPS_IP:4001 (from external)"
echo ""
echo "🧪 To test with sample data, run:"
echo "   node test-send-data.js"
echo ""
echo "📖 For more information, read:"
echo "   - README.md (Full documentation)"
echo "   - QUICK_START.md (Quick start guide)"
echo ""
echo "Happy coding! 🎉"

