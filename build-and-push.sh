#!/bin/bash
# Build and push PowerPlay-Stream monolithic Docker image to Artifact Registry
# Usage: bash build-and-push.sh [VERSION] [REGION]
# Example: bash build-and-push.sh v1.0 us-central1

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION=${2:-us-central1}
VERSION=${1:-latest}
REGISTRY="${REGION}-docker.pkg.dev"
IMAGE_NAME="powerplay-stream/app"
IMAGE_URI="${REGISTRY}/${PROJECT_ID}/${IMAGE_NAME}:${VERSION}"

echo ""
echo "=========================================="
echo "Building PowerPlay-Stream (Monolithic)"
echo "=========================================="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Version: $VERSION"
echo "Image URI: $IMAGE_URI"
echo ""

# Check if project is set
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: GCP project not set"
    echo "Run: gcloud config set project YOUR-PROJECT-ID"
    exit 1
fi

# Enable required APIs
echo "Enabling APIs..."
gcloud services enable artifactregistry.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet

# Create Artifact Registry repository if it doesn't exist
echo "Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe ${IMAGE_NAME%/*} --location=$REGION --quiet 2>/dev/null; then
    echo "Creating Artifact Registry repository..."
    gcloud artifacts repositories create ${IMAGE_NAME%/*} \
        --repository-format=docker \
        --location=$REGION \
        --quiet
fi

# Configure Docker authentication
echo "Configuring Docker authentication..."
gcloud auth configure-docker ${REGISTRY} --quiet

# Build the Docker image
echo ""
echo "Building Docker image..."
docker build -t ${IMAGE_URI} -f Dockerfile.monolithic .

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Push to Artifact Registry
echo ""
echo "Pushing to Artifact Registry..."
docker push ${IMAGE_URI}

if [ $? -ne 0 ]; then
    echo "❌ Push failed"
    exit 1
fi

# Success
echo ""
echo "=========================================="
echo "✅ SUCCESS"
echo "=========================================="
echo ""
echo "Image pushed to Artifact Registry:"
echo "  $IMAGE_URI"
echo ""
echo "Next steps:"
echo "1. Deploy to Cloud Run:"
echo "   gcloud run deploy powerplay-stream \\"
echo "     --image ${IMAGE_URI} \\"
echo "     --region $REGION \\"
echo "     --port 8080 \\"
echo "     --memory 512Mi \\"
echo "     --allow-unauthenticated"
echo ""
echo "2. Or manually deploy at:"
echo "   https://console.cloud.google.com/run"
echo ""
