# PowerPlay Stream - Automated Cloud Run Deployment Script (PowerShell)
# This script automates the deployment to Google Cloud Run on Windows

# Configuration
$PROJECT_ID = "komo-infra-479911"
$REGION = "us-central1"
$BACKEND_IMAGE = "gcr.io/${PROJECT_ID}/powerplay-backend:latest"
$FRONTEND_IMAGE = "gcr.io/${PROJECT_ID}/powerplay-frontend:latest"
$BACKEND_SERVICE = "powerplay-backend"
$FRONTEND_SERVICE = "powerplay-frontend"

Write-Host "PowerPlay Stream - Cloud Run Deployment" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Region: $REGION" -ForegroundColor Cyan
Write-Host ""

# Step 1: Authenticate with GCP
Write-Host "Step 1: Authenticating with GCP..." -ForegroundColor Yellow
gcloud auth login
gcloud config set project $PROJECT_ID
Write-Host "✓ Authentication complete" -ForegroundColor Green
Write-Host ""

# Step 2: Configure Docker registry
Write-Host "Step 2: Configuring Docker registry..." -ForegroundColor Yellow
gcloud auth configure-docker gcr.io
Write-Host "✓ Docker registry configured" -ForegroundColor Green
Write-Host ""

# Step 3: Build backend image
Write-Host "Step 3: Building backend Docker image..." -ForegroundColor Yellow
Push-Location backend
docker build -t $BACKEND_IMAGE .
Pop-Location
Write-Host "✓ Backend image built" -ForegroundColor Green
Write-Host ""

# Step 4: Build frontend image
Write-Host "Step 4: Building frontend Docker image..." -ForegroundColor Yellow
Push-Location frontend
docker build -t $FRONTEND_IMAGE .
Pop-Location
Write-Host "✓ Frontend image built" -ForegroundColor Green
Write-Host ""

# Step 5: Push backend image
Write-Host "Step 5: Pushing backend image to Container Registry..." -ForegroundColor Yellow
docker push $BACKEND_IMAGE
Write-Host "✓ Backend image pushed" -ForegroundColor Green
Write-Host ""

# Step 6: Push frontend image
Write-Host "Step 6: Pushing frontend image to Container Registry..." -ForegroundColor Yellow
docker push $FRONTEND_IMAGE
Write-Host "✓ Frontend image pushed" -ForegroundColor Green
Write-Host ""

# Step 7: Deploy backend
Write-Host "Step 7: Deploying backend to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $BACKEND_SERVICE `
  --image $BACKEND_IMAGE `
  --platform managed `
  --region $REGION `
  --project $PROJECT_ID `
  --port 8080 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 300 `
  --max-instances 10 `
  --min-instances 0 `
  --allow-unauthenticated `
  --set-env-vars="NODE_ENV=production,CLOUD_SQL_HOST=34.136.51.9,CLOUD_SQL_PORT=5432,CLOUD_SQL_DATABASE=video_metadata,GOOGLE_CLOUD_PROJECT=$PROJECT_ID"

Write-Host "✓ Backend deployed" -ForegroundColor Green
Write-Host ""

# Get backend URL
Write-Host "Retrieving backend URL..." -ForegroundColor Yellow
$BACKEND_URL = gcloud run services describe $BACKEND_SERVICE `
  --region $REGION `
  --project $PROJECT_ID `
  --format='value(status.url)' | Select-Object -First 1

Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Cyan
Write-Host ""

# Step 8: Deploy frontend
Write-Host "Step 8: Deploying frontend to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $FRONTEND_SERVICE `
  --image $FRONTEND_IMAGE `
  --platform managed `
  --region $REGION `
  --project $PROJECT_ID `
  --port 3000 `
  --memory 256Mi `
  --cpu 1 `
  --timeout 300 `
  --max-instances 5 `
  --min-instances 0 `
  --allow-unauthenticated `
  --set-env-vars="REACT_APP_API_URL=$BACKEND_URL"

Write-Host "✓ Frontend deployed" -ForegroundColor Green
Write-Host ""

# Get frontend URL
Write-Host "Retrieving frontend URL..." -ForegroundColor Yellow
$FRONTEND_URL = gcloud run services describe $FRONTEND_SERVICE `
  --region $REGION `
  --project $PROJECT_ID `
  --format='value(status.url)' | Select-Object -First 1

Write-Host "Frontend URL: $FRONTEND_URL" -ForegroundColor Cyan
Write-Host ""

# Step 9: Update backend with frontend URL
Write-Host "Step 9: Updating backend with frontend URL..." -ForegroundColor Yellow
gcloud run services update $BACKEND_SERVICE `
  --set-env-vars="FRONTEND_URL=$FRONTEND_URL" `
  --region $REGION `
  --project $PROJECT_ID

Write-Host "✓ Backend updated with frontend URL" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Access your application:" -ForegroundColor Cyan
Write-Host "Frontend: $FRONTEND_URL" -ForegroundColor Yellow
Write-Host "Backend API: $BACKEND_URL" -ForegroundColor Yellow
Write-Host ""

Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  View logs: gcloud run logs read $BACKEND_SERVICE --region $REGION --follow"
Write-Host "  View services: gcloud run services list --region $REGION"
Write-Host "  Update service: gcloud run services update $BACKEND_SERVICE --region $REGION --set-env-vars=KEY=VALUE"
Write-Host ""
