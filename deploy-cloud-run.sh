#!/bin/bash

# PowerPlay Stream - Cloud Run Deployment Script
# This script deploys the backend to Google Cloud Run

set -e

# Configuration
PROJECT_ID="komo-infra-479911"
REGION="us-central1"
SERVICE_NAME="video-processor"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "=========================================="
echo "PowerPlay Stream - Cloud Run Deployment"
echo "=========================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo "Image: $IMAGE_NAME"
echo ""

# Step 1: Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    echo "   Download from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✓ gcloud CLI found"

# Step 2: Authenticate with GCP
echo ""
echo "🔐 Authenticating with GCP..."
gcloud auth login

# Step 3: Set project
echo ""
echo "📋 Setting project..."
gcloud config set project $PROJECT_ID

# Step 4: Build Docker image
echo ""
echo "🔨 Building Docker image..."
echo "   Building from: ./backend"
gcloud builds submit \
    --tag $IMAGE_NAME \
    --source=./backend \
    --config=cloudbuild.yaml

# Step 5: Deploy to Cloud Run
echo ""
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 3600 \
    --set-env-vars NODE_ENV=production,USE_MYSQL=true,DB_DIALECT=postgres \
    --add-cloudsql-instances komo-infra-479911:us-central1:video-metadata \
    --service-account=video-processor@komo-infra-479911.iam.gserviceaccount.com

# Step 6: Get service URL
echo ""
echo "✅ Deployment complete!"
echo ""
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format 'value(status.url)')

echo "Service URL: $SERVICE_URL"
echo ""
echo "Update your frontend API URL to:"
echo "   REACT_APP_API_URL=$SERVICE_URL/api"
echo ""
echo "=========================================="
