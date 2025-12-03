# PowerPlay-Stream: Build & Deploy Guide

## Quick Start (10 minutes)

### 1. Prerequisites

```powershell
# Verify these are installed
docker --version
gcloud --version

# Login to Google Cloud
gcloud auth login

# Set your GCP project
gcloud config set project YOUR-PROJECT-ID
```

### 2. Create Artifact Registry (One Time)

```powershell
$env:GCP_PROJECT_ID = "YOUR-PROJECT-ID"
$env:GCP_REGION = "us-central1"

# Enable APIs
gcloud services enable artifactregistry.googleapis.com run.googleapis.com

# Create repository
gcloud artifacts repositories create powerplay-stream `
  --repository-format=docker `
  --location=$env:GCP_REGION
```

### 3. Build Docker Image

```powershell
# Set environment variables
$env:GCP_PROJECT_ID = "YOUR-PROJECT-ID"
$env:GCP_REGION = "us-central1"

# Navigate to project
cd d:\GCP-Project\PowerPlayapp\PowerPlay-Stream\PowerPlay-Stream

# Build and push
.\build-monolithic.ps1

# Or with custom version
.\build-monolithic.ps1 -Version "v1.0"
```

**Build time: 3-5 minutes (first time), 2-3 minutes (subsequent)**

### 4. Deploy to Cloud Run (Manual)

1. Open: https://console.cloud.google.com/run
2. Click **Create Service**
3. Select **Deploy one revision from an existing container image**
4. Click **Select** → Artifact Registry → Choose image
5. Configure:
   - Service name: `powerplay-stream`
   - Region: `us-central1`
   - Port: `8080`
   - Memory: `512 Mi`
6. Click **Create**

**Deploy time: 2-5 minutes**

### 5. Test Your Service

After deployment, click the service URL in Cloud Console. Should load PowerPlay-Stream app.

---

## Environment Variables (Optional)

Set these in Cloud Run console if needed:

```
NODE_ENV=production
PORT=8080
DISABLE_IAP_VALIDATION=false

# If using Cloud SQL:
CLOUD_SQL_HOST=<ip>
CLOUD_SQL_USER=postgres
CLOUD_SQL_PASSWORD=<password>
CLOUD_SQL_DATABASE=powerplay_stream
```

---

## Project Structure

```
PowerPlay-Stream/
├── build-monolithic.ps1      ← Build script
├── Dockerfile.monolithic     ← Docker config
├── BUILD_AND_DEPLOY.md       ← This file
├── backend/                  ← Node.js/Express API
│   ├── src/
│   │   ├── index.js         ← Entry point (serves both)
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   └── middleware/
│   └── package.json
├── frontend/                 ← React app
│   ├── src/
│   ├── public/
│   ├── build/               ← Built app (included in image)
│   ├── package.json
│   └── nginx.conf
└── shared/
```

---

## How It Works

1. **Single Docker Image** (monolithic)
   - Contains both frontend (React) and backend (Node.js)
   - Frontend: Static files served by Express
   - Backend: APIs handled by Express routes
   - One port: 8080

2. **Request Flow**
   - Frontend: `/` → Serves React app
   - APIs: `/api/*` → Handled by Express routes
   - Health: `/health` → Returns 200 OK

3. **Deployment**
   - Single Cloud Run service
   - Scales 0-10 instances automatically
   - Lower latency (everything in one process)

---

## Troubleshooting

### Docker Build Fails

```powershell
# Check Docker is running
docker ps

# Verify files exist
Test-Path Dockerfile.monolithic
Test-Path backend/src/index.js
Test-Path frontend/build/index.html
```

### Push to Artifact Registry Fails

```powershell
# Re-authenticate
gcloud auth login
gcloud auth configure-docker "$env:GCP_REGION-docker.pkg.dev"

# Verify repository exists
gcloud artifacts repositories list
```

### Cloud Run Deployment Fails

```powershell
# Check image pushed successfully
gcloud artifacts docker images list "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream"

# View logs
gcloud run logs read powerplay-stream --region=$env:GCP_REGION --limit=100
```

### Service Won't Start

Check these in Cloud Run:
- Port: Must be `8080`
- Environment variables set correctly
- Memory: At least `512 Mi`

---

## Commands Reference

```powershell
# Build
.\build-monolithic.ps1

# Get service URL
gcloud run services describe powerplay-stream `
  --region=$env:GCP_REGION `
  --format='value(status.url)'

# View logs
gcloud run logs read powerplay-stream --region=$env:GCP_REGION --limit=50

# Update deployment
.\build-monolithic.ps1 -Version "v1.1"
# Then update Cloud Run with new image in console

# Delete service
gcloud run services delete powerplay-stream --region=$env:GCP_REGION
```

---

## Tips

- **First build takes 3-5 minutes** (dependencies being installed)
- **Subsequent builds are faster** (cached layers)
- **Keep `NODE_ENV=production`** in Cloud Run for performance
- **Monitor logs** in Cloud Console if issues occur
- **Use versioning** (`-Version v1.0`, `v1.1`) for easy rollbacks

---

## Next Steps

1. Run: `.\build-monolithic.ps1`
2. Copy the image URI from script output
3. Deploy in Google Cloud Console
4. Test: Click service URL to open app
5. Monitor: Check logs in Cloud Console

Done! Your app is live. 🚀
