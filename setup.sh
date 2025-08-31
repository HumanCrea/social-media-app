#!/bin/bash

echo "🚀 Setting up Social Media App..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Generate Prisma client and run migrations
echo "🗄️  Setting up database..."
npx prisma generate
npx prisma migrate dev --name init

# Go back to root and install client dependencies
cd ../client
echo "📦 Installing client dependencies..."
npm install

# Go back to root
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the development servers, run:"
echo "  npm run dev"
echo ""
echo "This will start both:"
echo "  - Backend server at http://localhost:3001"
echo "  - Frontend client at http://localhost:5173"