#!/bin/bash

echo "🚀 Testing deployment configuration..."

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "✅ Docker is available"
    
    # Build the Docker image
    echo "🔨 Building Docker image..."
    docker build -t lavaa-admin-test . \
        --build-arg DATABASE_URL="postgresql://dummy" \
        --build-arg NEXTAUTH_SECRET="dummy-secret" \
        --build-arg JWT_SECRET="dummy-jwt" \
        --build-arg NEXTAUTH_URL="http://localhost:3000"
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker build successful!"
        echo "🧹 Cleaning up test image..."
        docker rmi lavaa-admin-test
    else
        echo "❌ Docker build failed"
        exit 1
    fi
else
    echo "⚠️  Docker not available, skipping Docker test"
fi

# Test regular build
echo "🔨 Testing npm build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ npm build successful!"
else
    echo "❌ npm build failed"
    exit 1
fi

echo "🎉 All tests passed! Deployment should work now."