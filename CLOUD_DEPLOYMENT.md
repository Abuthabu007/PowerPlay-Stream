# 🚀 PowerPlay Stream - Cloud Deployment Guide

## Cloud Environment Setup

Your project is configured for **Google Cloud Platform (GCP)** with:
- **Project ID**: `komo-infra-479911`
- **Region**: `us-central1`
- **Database**: Cloud SQL (PostgreSQL)
- **Storage**: Cloud Storage bucket (`play-video-upload-01`)
- **Compute**: Cloud Run

---

## 📋 Pre-Deployment Checklist

- [ ] GCP Project ID verified: `komo-infra-479911`
- [ ] Google Cloud SDK installed (`gcloud`)
- [ ] Service account key configured
- [ ] Cloud SQL instance running
- [ ] Cloud Storage bucket exists
- [ ] IAM permissions set up
- [ ] Environment variables configured

---

## 🔧 Step 1: Install Google Cloud SDK

### Download and Install
```bash
# Windows - Download from:
https://cloud.google.com/sdk/docs/install-sdk

# Or use chocolatey:
choco install google-cloud-sdk
```

### Verify Installation
```bash
gcloud --version
```

---

## 🔑 Step 2: Authenticate with GCP

### Initialize gcloud
```bash
gcloud init
```

### Set Project
```bash
gcloud config set project komo-infra-479911
```

### Authenticate
```bash
gcloud auth login
gcloud auth application-default login
```

### Verify Authentication
```bash
gcloud auth list
gcloud config list
```

---

## 📦 Step 3: Prepare Service Account Key

### Create Service Account (if needed)
```bash
gcloud iam service-accounts create powerplay-backend \
  --display-name="PowerPlay Backend Service"
```

### Grant Permissions
```bash
gcloud projects add-iam-policy-binding komo-infra-479911 \
  --member="serviceAccount:powerplay-backend@komo-infra-479911.iam.gserviceaccount.com" \
  --role="roles/editor"
```

### Create and Download Key
```bash
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=powerplay-backend@komo-infra-479911.iam.gserviceaccount.com
```

### Place Key File
```
Copy service-account-key.json to: backend/service-account-key.json
```

---

## 🗄️ Step 4: Configure Cloud SQL

### Verify Connection
```bash
# Test connection to your Cloud SQL instance
gcloud sql instances describe video-metadata
```

### Get Connection Info
```bash
gcloud sql instances describe video-metadata \
  --format="value(connectionName)"
```

### Update Database Configuration
The following is already configured in your `.env`:
```
CLOUD_SQL_HOST=34.136.51.9
CLOUD_SQL_USER=postgres
CLOUD_SQL_DATABASE=video_metadata
CLOUD_SQL_PORT=5432
```

### Create Database (if needed)
```bash
# Using Cloud Shell or local psql
psql -h 34.136.51.9 -U postgres -d postgres

# In PostgreSQL:
CREATE DATABASE video_metadata;
```

---

## 🪣 Step 5: Configure Cloud Storage

### Verify Bucket
```bash
gsutil ls
gsutil ls gs://play-video-upload-01
```

### Set Bucket Permissions
```bash
gsutil iam ch \
  serviceAccount:powerplay-backend@komo-infra-479911.iam.gserviceaccount.com:objectAdmin \
  gs://play-video-upload-01
```

### Enable Public Read (if needed)
```bash
gsutil iam ch \
  allUsers:objectViewer \
  gs://play-video-upload-01
```

---

## 🏗️ Step 6: Update Environment for Production

### Update Backend .env
```env
NODE_ENV=production
PORT=8080
USE_MYSQL=true

GCP_PROJECT_ID=komo-infra-479911
GCP_KEY_FILE=/workspace/service-account-key.json
GCP_REGION=us-central1

CLOUD_SQL_HOST=34.136.51.9
CLOUD_SQL_USER=postgres
CLOUD_SQL_PASSWORD=<your-password>
CLOUD_SQL_DATABASE=video_metadata
CLOUD_SQL_PORT=5432

GCS_BUCKET_NAME=play-video-upload-01

PUBSUB_TOPIC=eventarc-us-central1-my-trigger-538
PUBSUB_SUBSCRIPTION=eventarc-us-central1-my-trigger-sub-807

VERTEX_AI_MODEL_ID=powerplaystream_1764668948865

JWT_SECRET=<generate-secure-random-key>
JWT_EXPIRY=7d

REACT_APP_API_URL=https://video-processor-868383408248.us-central1.run.app/api
```

### Update Frontend .env
```env
REACT_APP_API_URL=https://video-processor-868383408248.us-central1.run.app/api
```

---

## 🐳 Step 7: Build Docker Images

### Build Backend Image
```bash
cd backend
docker build -t gcr.io/komo-infra-479911/powerplay-backend:latest .
```

### Build Frontend Image
```bash
cd frontend
docker build -t gcr.io/komo-infra-479911/powerplay-frontend:latest .
```

### Verify Images
```bash
docker images | grep powerplay
```

---

## 📤 Step 8: Push to Google Container Registry

### Configure Docker Authentication
```bash
gcloud auth configure-docker
```

### Push Backend
```bash
docker push gcr.io/komo-infra-479911/powerplay-backend:latest
```

### Push Frontend
```bash
docker push gcr.io/komo-infra-479911/powerplay-frontend:latest
```

### Verify in Registry
```bash
gcloud container images list --repository-format="{{.repository}}"
```

---

## 🚀 Step 9: Deploy to Cloud Run

### Deploy Backend
```bash
gcloud run deploy powerplay-backend \
  --image gcr.io/komo-infra-479911/powerplay-backend:latest \
  --platform managed \
  --region us-central1 \
  --port 8080 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production,USE_MYSQL=true \
  --service-account powerplay-backend@komo-infra-479911.iam.gserviceaccount.com
```

### Deploy Frontend
```bash
gcloud run deploy powerplay-frontend \
  --image gcr.io/komo-infra-479911/powerplay-frontend:latest \
  --platform managed \
  --region us-central1 \
  --port 3000 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --set-env-vars REACT_APP_API_URL=https://video-processor-868383408248.us-central1.run.app/api
```

### Get Service URLs
```bash
gcloud run services list --platform managed
```

---

## 🔗 Step 10: Configure CORS and API Gateway

### Create API Gateway (Optional)
```bash
# Create api-gateway.yaml
gcloud api-gateway apis create powerplay-api

gcloud api-gateway api-configs create powerplay-config \
  --backend-auth-service-account powerplay-backend@komo-infra-479911.iam.gserviceaccount.com \
  --api powerplay-api \
  --openapi-spec api-gateway.yaml
```

### Update Frontend URL
Update the backend service URL in:
- `frontend/.env`
- `frontend/src/services/api.js`

---

## 🔒 Step 11: Set Up SSL/HTTPS

### Use Cloud Load Balancer
```bash
# Create HTTP load balancer
gcloud compute forwarding-rules create powerplay-lb \
  --global \
  --load-balancing-scheme EXTERNAL \
  --target-http-proxy powerplay-proxy
```

### Configure SSL Certificate (Optional)
```bash
# Use Google-managed SSL certificate
gcloud compute ssl-certificates create powerplay-cert \
  --domains yourdomain.com
```

---

## 📊 Step 12: Configure Database Connection

### Update database.js for Production
```javascript
// backend/src/config/database.js
const sequelize = new Sequelize({
  host: process.env.CLOUD_SQL_HOST,
  username: process.env.CLOUD_SQL_USER,
  password: process.env.CLOUD_SQL_PASSWORD,
  database: process.env.CLOUD_SQL_DATABASE,
  port: process.env.CLOUD_SQL_PORT,
  dialect: 'postgres',  // Changed from mysql to postgres
  logging: false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  }
});
```

---

## 🧪 Step 13: Test Cloud Deployment

### Test Backend Health
```bash
curl https://powerplay-backend-xxx.run.app/health
```

### Test Frontend Access
```bash
# Open in browser:
https://powerplay-frontend-xxx.run.app
```

### View Logs
```bash
# Backend logs
gcloud run logs read powerplay-backend --limit 50

# Frontend logs
gcloud run logs read powerplay-frontend --limit 50
```

---

## 📈 Step 14: Monitor and Scale

### View Service Details
```bash
gcloud run services describe powerplay-backend
```

### Update Auto-scaling
```bash
gcloud run services update powerplay-backend \
  --min-instances 1 \
  --max-instances 10
```

### View Metrics
```bash
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

---

## 🆘 Troubleshooting

### Check Service Status
```bash
gcloud run services describe powerplay-backend
```

### View Deployment Logs
```bash
gcloud run logs read powerplay-backend --limit 100 --follow
```

### Database Connection Issues
```bash
# Test connection
psql -h 34.136.51.9 -U postgres -d video_metadata
```

### Clear Cache
```bash
docker system prune -a
```

### Redeploy Service
```bash
gcloud run deploy powerplay-backend \
  --image gcr.io/komo-infra-479911/powerplay-backend:latest \
  --region us-central1
```

---

## 🎯 Quick Deployment Commands

### One-time Setup
```bash
# 1. Authenticate
gcloud auth login
gcloud config set project komo-infra-479911

# 2. Create service account
gcloud iam service-accounts create powerplay-backend \
  --display-name="PowerPlay Backend"

# 3. Create key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=powerplay-backend@komo-infra-479911.iam.gserviceaccount.com
```

### Build and Deploy
```bash
# Build images
docker build -t gcr.io/komo-infra-479911/powerplay-backend:latest ./backend
docker build -t gcr.io/komo-infra-479911/powerplay-frontend:latest ./frontend

# Push to registry
gcloud auth configure-docker
docker push gcr.io/komo-infra-479911/powerplay-backend:latest
docker push gcr.io/komo-infra-479911/powerplay-frontend:latest

# Deploy services
gcloud run deploy powerplay-backend \
  --image gcr.io/komo-infra-479911/powerplay-backend:latest \
  --region us-central1 --allow-unauthenticated

gcloud run deploy powerplay-frontend \
  --image gcr.io/komo-infra-479911/powerplay-frontend:latest \
  --region us-central1 --allow-unauthenticated
```

---

## 📝 Environment Variables for Cloud

Place in Cloud Run environment:

**Backend:**
```
NODE_ENV=production
PORT=8080
USE_MYSQL=true
GCP_PROJECT_ID=komo-infra-479911
GCP_KEY_FILE=/workspace/service-account-key.json
CLOUD_SQL_HOST=34.136.51.9
CLOUD_SQL_USER=postgres
CLOUD_SQL_PASSWORD=<secure-password>
CLOUD_SQL_DATABASE=video_metadata
CLOUD_SQL_PORT=5432
GCS_BUCKET_NAME=play-video-upload-01
JWT_SECRET=<secure-random-key>
```

**Frontend:**
```
REACT_APP_API_URL=https://powerplay-backend-xxx.run.app/api
```

---

## ✅ Deployment Checklist

- [ ] GCP SDK installed and authenticated
- [ ] Service account created and key downloaded
- [ ] Cloud SQL instance configured and tested
- [ ] Cloud Storage bucket created
- [ ] Docker images built successfully
- [ ] Images pushed to Container Registry
- [ ] Backend deployed to Cloud Run
- [ ] Frontend deployed to Cloud Run
- [ ] Environment variables set correctly
- [ ] CORS configured
- [ ] SSL/HTTPS enabled
- [ ] Monitoring and logging set up
- [ ] Auto-scaling configured
- [ ] Backup strategy in place

---

## 🔄 Update Deployment

To update after code changes:

```bash
# Rebuild image
docker build -t gcr.io/komo-infra-479911/powerplay-backend:latest ./backend

# Push new version
docker push gcr.io/komo-infra-479911/powerplay-backend:latest

# Deploy (Cloud Run will pick up new image)
gcloud run deploy powerplay-backend \
  --image gcr.io/komo-infra-479911/powerplay-backend:latest \
  --region us-central1
```

---

## 📞 Support

For issues with:
- **GCP**: [Google Cloud Documentation](https://cloud.google.com/docs)
- **Cloud Run**: [Cloud Run Quickstart](https://cloud.google.com/run/docs/quickstarts)
- **Cloud SQL**: [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- **Docker**: [Docker Documentation](https://docs.docker.com)

---

**Your application is ready for cloud deployment! Follow the steps above to deploy to Google Cloud.**
