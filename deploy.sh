#!/bin/bash
# PowerPlay Stream - Automated Cloud Run Deployment Script
# This script automates the deployment to Google Cloud Run

set -e

# Configuration
PROJECT_ID="komo-infra-479911"
REGION="us-central1"
BACKEND_IMAGE="gcr.io/${PROJECT_ID}/powerplay-backend:latest"
FRONTEND_IMAGE="gcr.io/${PROJECT_ID}/powerplay-frontend:latest"
BACKEND_SERVICE="powerplay-backend"
FRONTEND_SERVICE="powerplay-frontend"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}PowerPlay Stream - Cloud Run Deployment${NC}"
echo "=========================================="
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Step 1: Authenticate with GCP
echo -e "${YELLOW}Step 1: Authenticating with GCP...${NC}"
gcloud auth login
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✓ Authentication complete${NC}"
echo ""

# Step 2: Configure Docker registry
echo -e "${YELLOW}Step 2: Configuring Docker registry...${NC}"
gcloud auth configure-docker gcr.io
echo -e "${GREEN}✓ Docker registry configured${NC}"
echo ""

# Step 3: Build backend image
echo -e "${YELLOW}Step 3: Building backend Docker image...${NC}"
cd backend
docker build -t $BACKEND_IMAGE .
cd ..
echo -e "${GREEN}✓ Backend image built${NC}"
echo ""

# Step 4: Build frontend image
echo -e "${YELLOW}Step 4: Building frontend Docker image...${NC}"
cd frontend
docker build -t $FRONTEND_IMAGE .
cd ..
echo -e "${GREEN}✓ Frontend image built${NC}"
echo ""

# Step 5: Push backend image
echo -e "${YELLOW}Step 5: Pushing backend image to Container Registry...${NC}"
docker push $BACKEND_IMAGE
echo -e "${GREEN}✓ Backend image pushed${NC}"
echo ""

# Step 6: Push frontend image
echo -e "${YELLOW}Step 6: Pushing frontend image to Container Registry...${NC}"
docker push $FRONTEND_IMAGE
echo -e "${GREEN}✓ Frontend image pushed${NC}"
echo ""

# Step 7: Deploy backend
echo -e "${YELLOW}Step 7: Deploying backend to Cloud Run...${NC}"
gcloud run deploy $BACKEND_SERVICE \
  --image $BACKEND_IMAGE \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --port 8080 \
  --memory 1Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 100 \
  --min-instances 1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,CLOUD_SQL_HOST=34.136.51.9,CLOUD_SQL_PORT=5432,CLOUD_SQL_DATABASE=video_metadata,GOOGLE_CLOUD_PROJECT=$PROJECT_ID"

echo -e "${GREEN}✓ Backend deployed${NC}"
echo ""

# Get backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(status.url)')
echo "Backend URL: $BACKEND_URL"
echo ""

# Step 8: Deploy frontend
echo -e "${YELLOW}Step 8: Deploying frontend to Cloud Run...${NC}"
gcloud run deploy $FRONTEND_SERVICE \
  --image $FRONTEND_IMAGE \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 50 \
  --min-instances 1 \
  --allow-unauthenticated \
  --set-env-vars="REACT_APP_API_URL=$BACKEND_URL"

echo -e "${GREEN}✓ Frontend deployed${NC}"
echo ""

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(status.url)')
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Step 9: Update backend with frontend URL
echo -e "${YELLOW}Step 9: Updating backend with frontend URL...${NC}"
gcloud run services update $BACKEND_SERVICE \
  --set-env-vars="FRONTEND_URL=$FRONTEND_URL" \
  --region $REGION \
  --project $PROJECT_ID

echo -e "${GREEN}✓ Backend updated with frontend URL${NC}"
echo ""

echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Access your application:"
echo -e "${YELLOW}Frontend: $FRONTEND_URL${NC}"
echo -e "${YELLOW}Backend API: $BACKEND_URL${NC}"
echo ""
echo "Useful commands:"
echo "  View logs: gcloud run logs read $BACKEND_SERVICE --region $REGION --follow"
echo "  View services: gcloud run services list --region $REGION"
echo "  Update service: gcloud run services update $BACKEND_SERVICE --region $REGION --set-env-vars=KEY=VALUE"
echo ""
