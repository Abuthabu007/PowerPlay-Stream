# Cloud Run Deployment Guide

This guide provides step-by-step instructions for building Docker images and deploying to Google Cloud Run.

## Prerequisites

- Google Cloud SDK installed and configured (`gcloud` CLI)
- Docker installed and running
- Project authenticated with GCP (`gcloud auth login`)
- GCP Project ID set (`gcloud config set project PROJECT_ID`)

## Step 1: Configure GCP Project

```powershell
# Set your GCP project ID
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# Verify configuration
gcloud config list
gcloud auth list
```

## Step 2: Enable Required APIs

```powershell
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## Step 3: Create Artifact Registry Repository

```powershell
# Create repository for storing Docker images
gcloud artifacts repositories create powerplay-stream `
  --repository-format=docker `
  --location=$env:GCP_REGION `
  --description="PowerPlay Stream Docker Images"

# Configure Docker authentication
gcloud auth configure-docker "$env:GCP_REGION-docker.pkg.dev"
```

## Step 4: Build Backend Image

```powershell
# Navigate to project root
cd backend

# Build the backend image
docker build -t "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/backend:latest" .

# Push to Artifact Registry
docker push "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/backend:latest"
```

## Step 5: Build Frontend Image

```powershell
# Navigate to frontend directory
cd ../frontend

# Build the frontend image
docker build -t "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/frontend:latest" .

# Push to Artifact Registry
docker push "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/frontend:latest"
```

## Step 6: Deploy Backend to Cloud Run

```powershell
# Create Cloud SQL database connection (if using Cloud SQL)
# First, ensure Cloud SQL proxy is configured

gcloud run deploy powerplay-stream-backend `
  --image "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/backend:latest" `
  --region $env:GCP_REGION `
  --platform managed `
  --allow-unauthenticated `
  --port 5000 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 3600 `
  --set-env-vars "NODE_ENV=production,PORT=5000" `
  --service-account=powerplay-stream-backend@$env:GCP_PROJECT_ID.iam.gserviceaccount.com
```

## Step 7: Deploy Frontend to Cloud Run

```powershell
# Get the backend Cloud Run URL
$BACKEND_URL = gcloud run services describe powerplay-stream-backend `
  --region=$env:GCP_REGION `
  --platform=managed `
  --format='value(status.url)'

# Deploy frontend with backend URL
gcloud run deploy powerplay-stream-frontend `
  --image "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/frontend:latest" `
  --region $env:GCP_REGION `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 256Mi `
  --cpu 1 `
  --timeout 3600 `
  --set-env-vars "REACT_APP_API_URL=$BACKEND_URL/api"
```

## Step 8: Set Up Cloud SQL Connection (If Using)

```powershell
# Enable Cloud SQL Admin API
gcloud services enable sqladmin.googleapis.com

# Create Cloud SQL instance (if not exists)
gcloud sql instances create powerplay-stream-db `
  --database-version=POSTGRES_15 `
  --tier=db-f1-micro `
  --region=$env:GCP_REGION

# Create database
gcloud sql databases create powerplay_stream `
  --instance=powerplay-stream-db

# Create service account for Cloud Run
gcloud iam service-accounts create powerplay-stream-backend
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID `
  --member="serviceAccount:powerplay-stream-backend@$env:GCP_PROJECT_ID.iam.gserviceaccount.com" `
  --role="roles/cloudsql.client"
```

## Step 9: Set Environment Variables on Cloud Run

Update the backend Cloud Run service with production environment variables:

```powershell
gcloud run services update powerplay-stream-backend `
  --region $env:GCP_REGION `
  --platform managed `
  --update-env-vars "CLOUD_SQL_HOST=<CLOUD_SQL_INSTANCE_IP>,CLOUD_SQL_USER=postgres,CLOUD_SQL_PASSWORD=<PASSWORD>,CLOUD_SQL_DATABASE=powerplay_stream,GCP_PROJECT_ID=$env:GCP_PROJECT_ID,GCP_REGION=$env:GCP_REGION,GOOGLE_APPLICATION_CREDENTIALS=/var/secrets/google/key.json"
```

## Step 10: Configure IAP (Optional - For Production)

```powershell
# Enable IAP
gcloud services enable iap.googleapis.com

# Configure OAuth consent screen and Create OAuth 2.0 credentials
# Then configure IAP on Cloud Run service

gcloud iap web enable `
  --resource-names="projects/$env:GCP_PROJECT_ID/global/backendServices/powerplay-stream-backend"
```

## Common Commands

### View Logs
```powershell
# Backend logs
gcloud run logs read powerplay-stream-backend --region=$env:GCP_REGION

# Frontend logs
gcloud run logs read powerplay-stream-frontend --region=$env:GCP_REGION
```

### Update Deployment
```powershell
# Redeploy after code changes
docker build -t "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/backend:latest" backend/
docker push "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/backend:latest"

gcloud run deploy powerplay-stream-backend `
  --image "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/backend:latest" `
  --region=$env:GCP_REGION
```

### Get Service URLs
```powershell
gcloud run services list --region=$env:GCP_REGION --format="table(SERVICE_NAME,URL)"
```

### Delete Services
```powershell
gcloud run services delete powerplay-stream-backend --region=$env:GCP_REGION
gcloud run services delete powerplay-stream-frontend --region=$env:GCP_REGION
```

## Troubleshooting

### Container fails to start
```powershell
# Check logs
gcloud run logs read <service-name> --region=$env:GCP_REGION --limit=50

# Verify image locally
docker run --rm -p 5000:5000 <image-url>
```

### Health check failures
Ensure the `/health` endpoint is properly configured and responding with 200 status.

### Database connection issues
- Verify Cloud SQL instance is running
- Check service account has Cloud SQL client role
- Verify connection string environment variables

## Production Best Practices

1. **Use service accounts** with minimal required permissions
2. **Enable Cloud Armor** for DDoS protection
3. **Set up Cloud CDN** for frontend caching
4. **Enable Cloud Logging** and set up alerts
5. **Use Cloud Secret Manager** for sensitive data
6. **Set resource limits** (memory, CPU) appropriately
7. **Enable automatic scaling** based on load
8. **Configure Cloud SQL Proxy** for secure database connections
9. **Use IAP** for authentication in production
10. **Enable audit logging** for compliance

## Scaling Configuration

To handle production loads, adjust Cloud Run settings:

```powershell
gcloud run services update powerplay-stream-backend `
  --region $env:GCP_REGION `
  --min-instances 1 `
  --max-instances 10 `
  --memory 1Gi `
  --cpu 2 `
  --concurrency 100
```

## Cost Optimization

- Use `--min-instances 0` for services with sporadic traffic
- Set appropriate memory/CPU (lower = cheaper, but slower)
- Use Cloud Scheduler for background jobs instead of always-running services
- Monitor and cleanup unused Cloud Run services regularly
