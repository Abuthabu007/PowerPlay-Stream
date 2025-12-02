# PowerPlay Stream - Cloud Deployment Checklist

This checklist will guide you through deploying PowerPlay Stream to Google Cloud Platform.

## Pre-Deployment Setup (One-Time)

- [ ] **Google Cloud SDK Installed**
  ```powershell
  # Download from https://cloud.google.com/sdk/docs/install-gcloud-cli
  # Or via Chocolatey: choco install google-cloud-sdk
  gcloud --version
  ```

- [ ] **gcloud CLI Authenticated**
  ```powershell
  gcloud auth login
  gcloud config set project komo-infra-479911
  gcloud auth application-default login
  ```

- [ ] **Docker Installed and Running**
  ```powershell
  docker --version
  docker run hello-world
  ```

- [ ] **Service Account Key Available**
  - Location: `/workspace/service-account-key.json`
  - Set environment variable:
    ```powershell
    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account-key.json"
    ```

- [ ] **Cloud SQL Proxy Installed (Optional, for local testing)**
  ```powershell
  # For Cloud SQL access from local machine during development
  gcloud components install cloud-sql-proxy
  ```

## Pre-Deployment Verification

- [ ] **Verify Environment Variables**
  - [ ] `.env` file contains valid GCP credentials
  - [ ] `CLOUD_SQL_HOST`: 34.136.51.9
  - [ ] `CLOUD_SQL_PORT`: 5432 (PostgreSQL)
  - [ ] `CLOUD_SQL_DATABASE`: video_metadata
  - [ ] `GOOGLE_CLOUD_PROJECT`: komo-infra-479911
  - [ ] `CLOUD_STORAGE_BUCKET`: play-video-upload-01

- [ ] **Backend Verification**
  ```powershell
  cd backend
  npm list pg pg-hstore  # Verify PostgreSQL drivers installed
  npm list
  ```

- [ ] **Frontend Verification**
  ```powershell
  cd frontend
  npm list
  npm run build  # Test production build
  ```

- [ ] **Code Review**
  - [ ] database.js correctly detects PostgreSQL (port 5432)
  - [ ] Dockerfiles are properly configured
  - [ ] All dependencies are listed in package.json files

## Docker Image Build & Push

- [ ] **Configure Docker Registry Auth**
  ```powershell
  gcloud auth configure-docker gcr.io
  ```

- [ ] **Build Backend Docker Image**
  ```powershell
  cd backend
  docker build -t gcr.io/komo-infra-479911/powerplay-backend:latest .
  docker build -t gcr.io/komo-infra-479911/powerplay-backend:v1.0 .
  ```

- [ ] **Build Frontend Docker Image**
  ```powershell
  cd frontend
  docker build -t gcr.io/komo-infra-479911/powerplay-frontend:latest .
  docker build -t gcr.io/komo-infra-479911/powerplay-frontend:v1.0 .
  ```

- [ ] **Push Backend to Container Registry**
  ```powershell
  docker push gcr.io/komo-infra-479911/powerplay-backend:latest
  docker push gcr.io/komo-infra-479911/powerplay-backend:v1.0
  ```

- [ ] **Push Frontend to Container Registry**
  ```powershell
  docker push gcr.io/komo-infra-479911/powerplay-frontend:latest
  docker push gcr.io/komo-infra-479911/powerplay-frontend:v1.0
  ```

- [ ] **Verify Images in Registry**
  ```powershell
  gcloud container images list --project=komo-infra-479911
  gcloud container images describe gcr.io/komo-infra-479911/powerplay-backend:latest
  gcloud container images describe gcr.io/komo-infra-479911/powerplay-frontend:latest
  ```

## Cloud SQL Setup

- [ ] **Verify Cloud SQL Instance**
  ```powershell
  gcloud sql instances describe cloudsql-instance --project=komo-infra-479911
  ```

- [ ] **Create Database (if not exists)**
  ```powershell
  gcloud sql databases create video_metadata --instance=cloudsql-instance --project=komo-infra-479911
  ```

- [ ] **Verify Database User**
  ```powershell
  gcloud sql users list --instance=cloudsql-instance --project=komo-infra-479911
  ```

- [ ] **Test Cloud SQL Connection** (using Cloud SQL Proxy)
  ```powershell
  gcloud sql connect cloudsql-instance --user=postgres --project=komo-infra-479911
  # Test query: \dt (to list tables)
  ```

## Cloud Run Deployment - Backend

- [ ] **Deploy Backend Service**
  ```powershell
  gcloud run deploy powerplay-backend `
    --image gcr.io/komo-infra-479911/powerplay-backend:latest `
    --platform managed `
    --region us-central1 `
    --project komo-infra-479911 `
    --port 8080 `
    --memory 1Gi `
    --cpu 2 `
    --timeout 300 `
    --max-instances 100 `
    --min-instances 1 `
    --allow-unauthenticated
  ```

- [ ] **Configure Backend Environment Variables**
  ```powershell
  gcloud run services update powerplay-backend `
    --set-env-vars="NODE_ENV=production,CLOUD_SQL_HOST=34.136.51.9,CLOUD_SQL_PORT=5432,CLOUD_SQL_DATABASE=video_metadata,CLOUD_STORAGE_BUCKET=play-video-upload-01,GOOGLE_CLOUD_PROJECT=komo-infra-479911,JWT_SECRET=your-secret-key" `
    --region us-central1 `
    --project komo-infra-479911
  ```

- [ ] **Set Cloud SQL Credentials**
  ```powershell
  gcloud run services update powerplay-backend `
    --set-env-vars="CLOUD_SQL_USER=postgres,CLOUD_SQL_PASSWORD=your-password" `
    --region us-central1 `
    --project komo-infra-479911
  ```

- [ ] **Add Cloud SQL Connection**
  ```powershell
  gcloud run services update powerplay-backend `
    --add-cloudsql-instances=komo-infra-479911:us-central1:cloudsql-instance `
    --region us-central1 `
    --project komo-infra-479911
  ```

- [ ] **Get Backend Service URL**
  ```powershell
  gcloud run services describe powerplay-backend `
    --region us-central1 `
    --project komo-infra-479911 `
    --format="value(status.url)"
  ```

## Cloud Run Deployment - Frontend

- [ ] **Deploy Frontend Service**
  ```powershell
  gcloud run deploy powerplay-frontend `
    --image gcr.io/komo-infra-479911/powerplay-frontend:latest `
    --platform managed `
    --region us-central1 `
    --project komo-infra-479911 `
    --port 3000 `
    --memory 512Mi `
    --cpu 1 `
    --timeout 300 `
    --max-instances 50 `
    --min-instances 1 `
    --allow-unauthenticated
  ```

- [ ] **Configure Frontend Environment Variables**
  ```powershell
  # Get the Backend URL from previous step
  $BACKEND_URL = "https://powerplay-backend-xxxx.run.app"
  
  gcloud run services update powerplay-frontend `
    --set-env-vars="REACT_APP_API_URL=$BACKEND_URL" `
    --region us-central1 `
    --project komo-infra-479911
  ```

- [ ] **Get Frontend Service URL**
  ```powershell
  gcloud run services describe powerplay-frontend `
    --region us-central1 `
    --project komo-infra-479911 `
    --format="value(status.url)"
  ```

## Configure CORS & Networking

- [ ] **Update Backend CORS Configuration**
  - Edit: `backend/src/index.js`
  - Add frontend URL to CORS allowed origins:
  ```javascript
  const cors = require('cors');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5000',
      frontendUrl
    ],
    credentials: true
  }));
  ```

- [ ] **Set Frontend URL in Backend**
  ```powershell
  $FRONTEND_URL = "https://powerplay-frontend-xxxx.run.app"
  
  gcloud run services update powerplay-backend `
    --set-env-vars="FRONTEND_URL=$FRONTEND_URL" `
    --region us-central1 `
    --project komo-infra-479911
  ```

## Post-Deployment Testing

- [ ] **Test Backend Health Check**
  ```powershell
  $BACKEND_URL = "https://powerplay-backend-xxxx.run.app"
  Invoke-WebRequest -Uri "$BACKEND_URL/health"
  ```

- [ ] **Test Frontend Access**
  ```powershell
  $FRONTEND_URL = "https://powerplay-frontend-xxxx.run.app"
  # Open in browser: $FRONTEND_URL
  ```

- [ ] **Test API Endpoints**
  ```powershell
  # Get videos list
  Invoke-RestMethod -Uri "$BACKEND_URL/api/videos" -Method GET
  
  # Test search
  Invoke-RestMethod -Uri "$BACKEND_URL/api/search?q=test" -Method GET
  ```

- [ ] **Check Logs**
  ```powershell
  # Backend logs
  gcloud run logs read powerplay-backend --region us-central1 --project komo-infra-479911 --limit 50
  
  # Frontend logs
  gcloud run logs read powerplay-frontend --region us-central1 --project komo-infra-479911 --limit 50
  ```

- [ ] **Monitor Errors**
  ```powershell
  # Backend errors
  gcloud run logs read powerplay-backend --region us-central1 --project komo-infra-479911 --limit 100 | Select-String "ERROR"
  ```

## Cloud SQL Connection from Cloud Run

- [ ] **Grant Cloud Run Service Account Access**
  ```powershell
  # Get Cloud Run service account
  gcloud run services describe powerplay-backend --region us-central1 --format='value(spec.template.spec.serviceAccountName)'
  
  # Grant Cloud SQL Client role
  gcloud projects add-iam-policy-binding komo-infra-479911 `
    --member=serviceAccount:powerplay-backend@komo-infra-479911.iam.gserviceaccount.com `
    --role=roles/cloudsql.client
  ```

- [ ] **Verify Cloud SQL Network**
  ```powershell
  gcloud sql instances describe cloudsql-instance `
    --project=komo-infra-479911 `
    --format="value(settings.ipConfiguration.authorizedNetworks[].value)"
  ```

## Monitoring & Logging

- [ ] **Set Up Cloud Logging**
  ```powershell
  # View real-time logs
  gcloud run logs read powerplay-backend --region us-central1 --project komo-infra-479911 --follow
  ```

- [ ] **Set Up Cloud Monitoring**
  ```powershell
  # Go to: https://console.cloud.google.com/monitoring
  # Create dashboards for CPU, Memory, Request Rate, Errors
  ```

- [ ] **Set Up Error Reporting**
  ```powershell
  # Go to: https://console.cloud.google.com/errors
  # Configure error notifications
  ```

## Auto-Scaling Configuration

- [ ] **Backend Auto-Scaling**
  ```powershell
  gcloud run services update powerplay-backend `
    --min-instances 2 `
    --max-instances 100 `
    --region us-central1 `
    --project komo-infra-479911
  ```

- [ ] **Frontend Auto-Scaling**
  ```powershell
  gcloud run services update powerplay-frontend `
    --min-instances 1 `
    --max-instances 50 `
    --region us-central1 `
    --project komo-infra-479911
  ```

## SSL/TLS & Custom Domain (Optional)

- [ ] **Map Custom Domain (if applicable)**
  ```powershell
  gcloud run domain-mappings create `
    --service=powerplay-backend `
    --domain=api.yourdomain.com `
    --region=us-central1 `
    --project=komo-infra-479911
  ```

- [ ] **Update DNS Records**
  - Add CNAME record pointing to Cloud Run endpoint

## Cleanup & Optimization

- [ ] **Remove Old Images**
  ```powershell
  # List all images
  gcloud container images list --project=komo-infra-479911
  
  # Delete old versions
  gcloud container images delete gcr.io/komo-infra-479911/powerplay-backend:v0.1 --project=komo-infra-479911
  ```

- [ ] **View Resource Usage**
  ```powershell
  gcloud run services describe powerplay-backend --region us-central1 --project komo-infra-479911
  ```

- [ ] **Set Up Billing Alerts**
  ```powershell
  # Go to: https://console.cloud.google.com/billing
  # Set budget alerts for Cloud Run and Cloud SQL
  ```

## Rollback Procedure (If Needed)

- [ ] **Revert to Previous Version**
  ```powershell
  # List revisions
  gcloud run revisions list --service=powerplay-backend --region=us-central1 --project=komo-infra-479911
  
  # Deploy specific revision
  gcloud run deploy powerplay-backend `
    --image gcr.io/komo-infra-479911/powerplay-backend:v0.9 `
    --region us-central1 `
    --project komo-infra-479911
  ```

## Deployment Verification Summary

Once all steps are complete, verify:

```powershell
# 1. Services running
gcloud run services list --region us-central1 --project komo-infra-479911

# 2. Services accessible
$BACKEND = "https://powerplay-backend-xxxx.run.app"
$FRONTEND = "https://powerplay-frontend-xxxx.run.app"

# 3. Database connected
# Check backend logs for successful connection
gcloud run logs read powerplay-backend --region us-central1 --project komo-infra-479911 --limit 20

# 4. Frontend can reach backend
# Check browser console for API calls
# Open: $FRONTEND in browser

# 5. All systems operational
# Test upload, search, playback features
```

## Important Notes

1. **First-time deployment may take 5-10 minutes** for service to initialize
2. **Cloud SQL must be accessible** - verify network configuration
3. **Service account must have** - Cloud SQL Client, Storage Editor roles
4. **Environment variables** - Double-check all credentials are correctly set
5. **Monitor logs continuously** - Check for connection or startup errors
6. **Test incrementally** - Deploy backend first, then frontend
7. **Backup database** - Before major updates

## Support & Troubleshooting

- **Cloud Run Logs**: `gcloud run logs read <service-name> --region us-central1`
- **SQL Connection Issues**: Check Cloud SQL network settings and service account permissions
- **CORS Errors**: Verify `FRONTEND_URL` is set in backend environment
- **Storage Access**: Verify service account has Storage Editor role
- **Memory Issues**: Increase `--memory` flag if services crash (start with 1Gi for backend, 512Mi for frontend)

---

**Deployment Command Quick Reference:**

```powershell
# 1. Build images
docker build -t gcr.io/komo-infra-479911/powerplay-backend:latest backend/
docker build -t gcr.io/komo-infra-479911/powerplay-frontend:latest frontend/

# 2. Push images
docker push gcr.io/komo-infra-479911/powerplay-backend:latest
docker push gcr.io/komo-infra-479911/powerplay-frontend:latest

# 3. Deploy backend
gcloud run deploy powerplay-backend --image gcr.io/komo-infra-479911/powerplay-backend:latest --region us-central1 --project komo-infra-479911 --allow-unauthenticated --port 8080

# 4. Deploy frontend
gcloud run deploy powerplay-frontend --image gcr.io/komo-infra-479911/powerplay-frontend:latest --region us-central1 --project komo-infra-479911 --allow-unauthenticated --port 3000

# 5. View services
gcloud run services list --region us-central1 --project komo-infra-479911
```
