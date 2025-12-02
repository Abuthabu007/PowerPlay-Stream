# PowerPlay Stream - Deployment Guide

This guide covers deploying PowerPlay Stream to Google Cloud Platform (GCP).

## Prerequisites

1. GCP Project with billing enabled
2. Google Cloud SDK installed locally
3. Docker installed (for backend deployment)
4. gcloud CLI configured with your project

## Step 1: Set Up GCP Services

### 1.1 Create Cloud SQL Instance

```bash
# Create Cloud SQL MySQL instance
gcloud sql instances create powerplay-stream \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create powerplay_stream \
  --instance=powerplay-stream

# Create user
gcloud sql users create powerplay \
  --instance=powerplay-stream \
  --password=YOUR_PASSWORD
```

### 1.2 Create Cloud Storage Bucket

```bash
# Create bucket for videos
gsutil mb -l us-central1 gs://powerplay-stream-videos-YOURPROJECTID/

# Create bucket for frontend
gsutil mb -l us-central1 gs://powerplay-stream-app-YOURPROJECTID/

# Set lifecycle policies (optional)
gsutil lifecycle set - gs://powerplay-stream-videos-YOURPROJECTID/ <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF
```

### 1.3 Create Cloud Pub/Sub Topic

```bash
# Create topic
gcloud pubsub topics create video-transcoding-events

# Create subscription
gcloud pubsub subscriptions create video-transcoding-subscription \
  --topic=video-transcoding-events
```

### 1.4 Enable Vertex AI API

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Create/configure Vertex AI model for search
# Use Google's text embedding models for semantic search
```

### 1.5 Set Up Identity-Aware Proxy (IAP)

```bash
# Enable IAP
gcloud services enable iap.googleapis.com

# Create OAuth 2.0 client credentials
# (Configure in Google Cloud Console)
```

## Step 2: Deploy Backend (Cloud Run)

### 2.1 Prepare Backend

```bash
cd backend

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/index.js"]
EOF

# Create .dockerignore
cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
.env
EOF
```

### 2.2 Build and Push to Container Registry

```bash
# Set project ID
export PROJECT_ID=$(gcloud config get-value project)

# Build image
docker build -t gcr.io/$PROJECT_ID/powerplay-backend:latest .

# Push to Container Registry
docker push gcr.io/$PROJECT_ID/powerplay-backend:latest
```

### 2.3 Deploy to Cloud Run

```bash
# Deploy backend service
gcloud run deploy powerplay-backend \
  --image=gcr.io/$PROJECT_ID/powerplay-backend:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --timeout=3600 \
  --max-instances=100 \
  --set-env-vars=\
NODE_ENV=production,\
GCP_PROJECT_ID=$PROJECT_ID,\
CLOUD_SQL_HOST=/cloudsql/$PROJECT_ID:us-central1:powerplay-stream,\
CLOUD_SQL_USER=powerplay,\
CLOUD_SQL_PASSWORD=YOUR_PASSWORD,\
CLOUD_SQL_DATABASE=powerplay_stream,\
GCS_BUCKET_NAME=powerplay-stream-videos-$PROJECT_ID,\
PUBSUB_TOPIC=video-transcoding-events,\
PUBSUB_SUBSCRIPTION=video-transcoding-subscription

# Add Cloud SQL connection
gcloud run services update powerplay-backend \
  --region=us-central1 \
  --add-cloudsql-instances=$PROJECT_ID:us-central1:powerplay-stream
```

### 2.4 Configure IAP for Backend

```bash
# Get Cloud Run service URL
export BACKEND_URL=$(gcloud run services describe powerplay-backend \
  --region=us-central1 \
  --format='value(status.url)')

# Create OAuth 2.0 consent screen and credentials
# (Configure in Google Cloud Console)

# Enable IAP for Cloud Run
gcloud iap-oauth clients create \
  --display_name="PowerPlay Backend" \
  --brand_id=YOUR_BRAND_ID
```

## Step 3: Deploy Frontend (Cloud Storage + CDN)

### 3.1 Build Frontend

```bash
cd frontend

# Create .env for production
cat > .env.production << 'EOF'
REACT_APP_API_URL=https://YOUR_BACKEND_URL/api
EOF

# Build optimized bundle
npm run build
```

### 3.2 Deploy to Cloud Storage

```bash
# Upload build to Cloud Storage
gsutil -m cp -r build/* gs://powerplay-stream-app-$PROJECT_ID/

# Set index.html as error document
gsutil web set -m index.html -e index.html \
  gs://powerplay-stream-app-$PROJECT_ID

# Set public read permissions
gsutil iam ch serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com:objectViewer \
  gs://powerplay-stream-app-$PROJECT_ID
```

### 3.3 Set Up Cloud CDN

```bash
# Create backend bucket
gcloud compute backend-buckets create powerplay-backend-bucket \
  --gcs-uri-prefix=gs://powerplay-stream-app-$PROJECT_ID \
  --enable-cdn

# Create URL map
gcloud compute url-maps create powerplay-app-map \
  --default-backend-bucket=powerplay-backend-bucket

# Create HTTPS certificate
gcloud compute ssl-certificates create powerplay-ssl-cert \
  --domains=powerplay.yourdomain.com

# Create HTTPS proxy
gcloud compute target-https-proxies create powerplay-https-proxy \
  --url-map=powerplay-app-map \
  --ssl-certificates=powerplay-ssl-cert

# Create forwarding rule
gcloud compute forwarding-rules create powerplay-https-rule \
  --global \
  --target-https-proxy=powerplay-https-proxy \
  --address=RESERVED_IP \
  --ports=443
```

## Step 4: Configure Security & IAP

### 4.1 Set Up Service Account

```bash
# Create service account
gcloud iam service-accounts create powerplay-app

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:powerplay-app@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:powerplay-app@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/pubsub.editor

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:powerplay-app@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/aiplatform.user
```

### 4.2 Configure IAP

```bash
# Create IAP brand (one-time)
gcloud iap oauth-brands create \
  --display_name="PowerPlay Stream"

# Get brand ID
export BRAND_ID=$(gcloud iap oauth-brands list \
  --format="value(name)" | head -1 | cut -d'/' -f2)

# Create OAuth consent screen
gcloud iap oauth-clients create projects/$PROJECT_ID/brands/$BRAND_ID \
  --display_name="PowerPlay Web Application"

# Enable IAP on Cloud Run
gcloud iap web enable \
  --resource-type=backend-services \
  --service=powerplay-backend
```

## Step 5: Environment Configuration

### 5.1 Update Configurations

Create a `config.json` in the backend:

```json
{
  "production": {
    "database": {
      "host": "/cloudsql/PROJECT_ID:us-central1:powerplay-stream",
      "user": "powerplay",
      "password": "PASSWORD",
      "database": "powerplay_stream"
    },
    "storage": {
      "bucket": "powerplay-stream-videos-PROJECT_ID"
    },
    "pubsub": {
      "topic": "video-transcoding-events",
      "subscription": "video-transcoding-subscription"
    },
    "vertexai": {
      "model": "text-bison",
      "region": "us-central1"
    }
  }
}
```

## Step 6: Monitoring & Logging

### 6.1 Enable Cloud Logging

```bash
# Logs will automatically be sent to Cloud Logging
# View logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=powerplay-backend" \
  --limit=50 \
  --format=json

# Create log sink for long-term storage
gcloud logging sinks create powerplay-logs \
  gs://powerplay-logs-bucket/ \
  --log-filter='resource.type=cloud_run_revision'
```

### 6.2 Set Up Monitoring

```bash
# Create uptime check
gcloud monitoring uptime-checks create powerplay-backend \
  --display-name="PowerPlay Backend" \
  --http-check-path=/health \
  --port=443 \
  --monitored-resource=uptime-url \
  --http-check-use-ssl

# Create alerting policy
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="PowerPlay Backend Down" \
  --condition-display-name="Backend service down" \
  --condition-threshold-value=0 \
  --condition-threshold-duration=300s
```

## Step 7: Database Migrations

```bash
# Connect to Cloud SQL
cloud_sql_proxy -instances=$PROJECT_ID:us-central1:powerplay-stream=tcp:3306 &

# Run migrations
mysql -h 127.0.0.1 -u powerplay -p powerplay_stream < migrations/001_initial.sql

# Verify tables
mysql -h 127.0.0.1 -u powerplay -p powerplay_stream -e "SHOW TABLES;"
```

## Step 8: Testing

### 8.1 Health Check

```bash
# Test backend
curl https://YOUR_BACKEND_URL/health

# Test frontend (should return index.html)
curl https://powerplay.yourdomain.com/
```

### 8.2 API Testing

```bash
# Test upload endpoint
curl -X POST https://YOUR_BACKEND_URL/api/videos/upload \
  -H "Authorization: Bearer YOUR_IAP_TOKEN" \
  -F "video=@test-video.mp4"

# Test search endpoint
curl "https://YOUR_BACKEND_URL/api/search/suggestions?query=test" \
  -H "Authorization: Bearer YOUR_IAP_TOKEN"
```

## Troubleshooting

### Common Issues

1. **Cloud SQL Connection Failed**
   ```bash
   # Check Cloud SQL proxy
   cloud_sql_proxy -instances=$PROJECT_ID:us-central1:powerplay-stream=tcp:3306
   ```

2. **Cloud Storage Access Denied**
   ```bash
   # Check service account permissions
   gsutil iam ch serviceAccount:YOUR_SA@$PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
     gs://powerplay-stream-videos-$PROJECT_ID
   ```

3. **IAP Not Working**
   ```bash
   # Verify IAP is enabled
   gcloud iap web get-iam-policy \
     --resource-type=backend-services \
     --service=powerplay-backend
   ```

## Cost Optimization

1. **Scale Down Development**
   ```bash
   gcloud run deploy powerplay-backend \
     --region=us-central1 \
     --memory=256Mi \
     --max-instances=1
   ```

2. **Use Cloud Storage Lifecycle**
   - Archive old videos to Cold Storage
   - Delete test files automatically

3. **Monitor Costs**
   ```bash
   gcloud billing accounts list
   gcloud billing budgets create --billing-account=ACCOUNT_ID
   ```

## Maintenance

### Regular Tasks

- Monitor logs daily
- Review error rates
- Update dependencies monthly
- Backup database weekly
- Test disaster recovery quarterly

### Backup & Recovery

```bash
# Backup Cloud SQL
gcloud sql backups create \
  --instance=powerplay-stream

# Backup Cloud Storage
gsutil -m cp -r gs://powerplay-stream-videos-$PROJECT_ID \
  gs://powerplay-backups-$PROJECT_ID/
```

---

**Last Updated**: December 2, 2025
