# 🚀 Microservices Deployment Guide - Frontend + Backend on Cloud Run

> **Architecture:** 2 separate Cloud Run services communicating via REST API with CORS

---

## 📋 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Google Cloud Run                          │
├──────────────────────────────────────┬──────────────────────┤
│                                      │                      │
│   Frontend Service (Nginx)           │  Backend Service     │
│   ├─ React App (Static)              │  ├─ Express.js       │
│   ├─ Port: 8080                      │  ├─ Port: 5000       │
│   └─ REACT_APP_API_URL=              │  └─ FRONTEND_URL=    │
│       https://backend-...            │      https://front...│
│                                      │                      │
└──────────────────────────────────────┴──────────────────────┘
         │                                    │
         │         HTTPS (CORS)               │
         └────────────────────────────────────┘
```

---

## 🔧 Changes Made for Microservices

### Frontend Changes
✅ **Removed proxy** from `package.json` (not needed in production)  
✅ **Added build argument** to Dockerfile for API URL  
✅ Uses `REACT_APP_API_URL` environment variable  
✅ Runs on **Nginx** (port 8080)  

### Backend Changes
✅ **Configured CORS** to accept requests from frontend service  
✅ **Removed static file serving** (no longer serves frontend)  
✅ Supports `FRONTEND_URL` environment variable  
✅ Runs as **Express.js** (port 5000)  

---

## 📦 Prerequisites

```
☑️  GCP Project with billing enabled
☑️  Docker Desktop installed and running
☑️  gcloud CLI configured
☑️  PowerShell 5.1+
☑️  Frontend pre-built (runs: npm run build)
☑️  Backend lock file updated (npm install in backend/)
```

### Verify Setup
```powershell
docker --version
gcloud --version
gcloud auth list          # Check authenticated account
gcloud config list        # Check default project
```

---

## 🏗️ Step 1: Build Images Locally

### Build Frontend

```powershell
# Simple build (uses default API URL)
.\build-frontend.ps1

# Build with production API URL (recommended)
.\build-frontend.ps1 -ApiUrl "https://backend-xxxxx.a.run.app/api"

# Build and test
.\build-frontend.ps1 -ApiUrl "https://backend-xxxxx.a.run.app/api" -Test
```

**Output:** `powerplay-stream-frontend:latest`

### Build Backend

```powershell
# Simple build
.\build-backend.ps1

# Build with frontend URL (for CORS)
.\build-backend.ps1 -FrontendUrl "https://frontend-xxxxx.a.run.app"

# Build and test
.\build-backend.ps1 -FrontendUrl "https://frontend-xxxxx.a.run.app" -Test
```

**Output:** `powerplay-stream-backend:latest`

---

## ☁️ Step 2: Set up GCP

### 1. Set Environment Variables

```powershell
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# Optional: Make persistent
[Environment]::SetEnvironmentVariable("GCP_PROJECT_ID", "your-project-id", "User")
[Environment]::SetEnvironmentVariable("GCP_REGION", "us-central1", "User")
```

### 2. Enable Required APIs

```powershell
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Create Artifact Registry Repositories

```powershell
# Frontend repository
gcloud artifacts repositories create powerplay-stream-frontend `
  --repository-format=docker `
  --location=us-central1

# Backend repository
gcloud artifacts repositories create powerplay-stream-backend `
  --repository-format=docker `
  --location=us-central1

# List repositories
gcloud artifacts repositories list
```

---

## 📤 Step 3: Build and Push to GCP

### Push Frontend

```powershell
$env:GCP_PROJECT_ID = "your-project-id"

# Build with production URL (don't know backend URL yet? Use dummy)
.\build-frontend.ps1 `
  -ApiUrl "https://backend-placeholder.a.run.app/api" `
  -ProjectId $env:GCP_PROJECT_ID `
  -Region "us-central1" `
  -Test `
  -Push `
  -Version "v1.0"
```

**Note the output image URL!**

### Deploy Frontend to Cloud Run

```powershell
$FRONTEND_IMAGE = "us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream-frontend/powerplay-stream-frontend:v1.0"

gcloud run deploy powerplay-frontend `
  --image=$FRONTEND_IMAGE `
  --region=us-central1 `
  --port=8080 `
  --allow-unauthenticated `
  --platform=managed
```

**Save the service URL!** (looks like: `https://powerplay-frontend-xxxxx.a.run.app`)

### Push Backend

```powershell
$FRONTEND_URL = "https://powerplay-frontend-xxxxx.a.run.app"  # From above

.\build-backend.ps1 `
  -FrontendUrl $FRONTEND_URL `
  -ProjectId $env:GCP_PROJECT_ID `
  -Region "us-central1" `
  -Test `
  -Push `
  -Version "v1.0"
```

**Note the output image URL!**

### Deploy Backend to Cloud Run

```powershell
$BACKEND_IMAGE = "us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream-backend/powerplay-stream-backend:v1.0"
$FRONTEND_URL = "https://powerplay-frontend-xxxxx.a.run.app"

gcloud run deploy powerplay-backend `
  --image=$BACKEND_IMAGE `
  --region=us-central1 `
  --port=5000 `
  --allow-unauthenticated `
  --set-env-vars="FRONTEND_URL=$FRONTEND_URL,DISABLE_IAP_VALIDATION=true" `
  --platform=managed
```

**Save the service URL!** (looks like: `https://powerplay-backend-xxxxx.a.run.app`)

---

## 🔄 Step 4: Update Frontend with Real Backend URL

Now that backend is deployed, update frontend with real API URL:

```powershell
$BACKEND_URL = "https://powerplay-backend-xxxxx.a.run.app/api"

# Rebuild frontend with real backend URL
.\build-frontend.ps1 `
  -ApiUrl $BACKEND_URL `
  -ProjectId $env:GCP_PROJECT_ID `
  -Region "us-central1" `
  -Push `
  -Version "v1.1"

# Redeploy frontend
$FRONTEND_IMAGE = "us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream-frontend/powerplay-stream-frontend:v1.1"

gcloud run deploy powerplay-frontend `
  --image=$FRONTEND_IMAGE `
  --region=us-central1 `
  --port=8080 `
  --allow-unauthenticated `
  --platform=managed
```

---

## ✅ Verify Deployment

### Test Frontend

```powershell
curl https://powerplay-frontend-xxxxx.a.run.app
```

Should return HTML (React app).

### Test Backend Health

```powershell
curl https://powerplay-backend-xxxxx.a.run.app/health
```

Should return:
```json
{"status":"OK","timestamp":"2025-12-19T..."}
```

### Test Backend API

```powershell
curl https://powerplay-backend-xxxxx.a.run.app/api/videos/public
```

Should return videos list (or empty if no videos uploaded).

---

## 🔐 Environment Variables

### Backend (.env or Cloud Run)

| Variable | Purpose | Example |
|----------|---------|---------|
| `FRONTEND_URL` | CORS origin | `https://frontend-xxxxx.a.run.app` |
| `DISABLE_IAP_VALIDATION` | Skip IAP auth (if not using) | `true` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `5000` |
| `VIRUSTOTAL_API_KEY` | Virus scanning | Your API key |
| `GCP_PROJECT_ID` | GCP project | `your-project-id` |

### Frontend

Set during Docker build:

```powershell
.\build-frontend.ps1 -ApiUrl "https://backend-xxxxx.a.run.app/api"
```

Or after building, edit `.env` and rebuild.

---

## 🚨 Troubleshooting

### CORS Errors in Frontend Console

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Fix:** Check backend environment variables
```powershell
gcloud run services describe powerplay-backend --region=us-central1
```

Verify `FRONTEND_URL` is set correctly.

### Backend Cannot Start

**Error:** `Error: Cannot find module 'clamscan'`

**Fix:** Rebuild backend (npm install already updated lock file)
```powershell
.\build-backend.ps1 -Push -Version "v1.1"
```

### Frontend Shows Loading Forever

**Error:** API calls hang, frontend never loads

**Fix:** Verify backend is accessible
```powershell
curl https://powerplay-backend-xxxxx.a.run.app/health
```

If backend is down, check Cloud Run logs:
```powershell
gcloud run logs read powerplay-backend --region=us-central1 --limit=50
```

### Out of Memory / High CPU

**Solutions:**
```powershell
# Increase memory (default 512MB)
gcloud run deploy powerplay-backend `
  --memory=1Gi `
  --cpu=2 `
  # ... other params

# Check metrics
gcloud monitoring time-series list
```

---

## 📊 View Logs

### Backend Logs

```powershell
# Real-time
gcloud run logs read powerplay-backend --region=us-central1 --follow

# Last 50 lines
gcloud run logs read powerplay-backend --region=us-central1 --limit=50

# Specific time range
gcloud run logs read powerplay-backend `
  --region=us-central1 `
  --start-time=2025-12-19T00:00:00Z
```

### Frontend Logs

```powershell
gcloud run logs read powerplay-frontend --region=us-central1 --follow
```

---

## 🔄 Updates & Redeployment

### Update Backend

```powershell
# Change code → rebuild → push → redeploy
.\build-backend.ps1 -ProjectId $env:GCP_PROJECT_ID -Push -Version "v1.2"

gcloud run deploy powerplay-backend `
  --image=us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream-backend/powerplay-stream-backend:v1.2 `
  --region=us-central1
```

### Update Frontend

```powershell
$BACKEND_URL = "https://powerplay-backend-xxxxx.a.run.app/api"

.\build-frontend.ps1 `
  -ApiUrl $BACKEND_URL `
  -ProjectId $env:GCP_PROJECT_ID `
  -Push `
  -Version "v1.2"

gcloud run deploy powerplay-frontend `
  --image=us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream-frontend/powerplay-stream-frontend:v1.2 `
  --region=us-central1
```

---

## 💰 Cost Optimization

### Cloud Run Pricing (Free tier includes)
- **2 million requests/month** ✅ Free
- **360,000 GB-seconds/month** ✅ Free
- After free tier: ~$0.40/million requests

### Reduce Costs

1. **Use min instances = 0**
   ```powershell
   gcloud run deploy powerplay-backend `
     --min-instances=0 `
     --max-instances=10
   ```

2. **Use CPU only when needed**
   ```powershell
   gcloud run deploy powerplay-backend `
     --cpu-boost `
     --cpu=1
   ```

3. **Delete unused services**
   ```powershell
   gcloud run services delete powerplay-backend
   ```

---

## 📝 Checklists

### Pre-Deployment
- [ ] Docker running
- [ ] GCP project configured
- [ ] gcloud CLI authenticated
- [ ] APIs enabled (Artifact Registry, Cloud Run, Cloud Build)
- [ ] Artifact Registry repositories created
- [ ] Frontend pre-built
- [ ] Backend lock file updated

### Deployment
- [ ] Frontend built locally
- [ ] Frontend pushed to Artifact Registry
- [ ] Frontend deployed to Cloud Run
- [ ] Frontend URL noted
- [ ] Backend built with FRONTEND_URL
- [ ] Backend pushed to Artifact Registry
- [ ] Backend deployed to Cloud Run with FRONTEND_URL env var
- [ ] Backend URL noted
- [ ] Frontend redeployed with real API URL

### Post-Deployment
- [ ] Frontend accessible at https://frontend-xxxxx.a.run.app
- [ ] Backend health check working
- [ ] CORS not blocking requests
- [ ] Logs show no errors
- [ ] API endpoints responding

---

## 🎯 Quick Reference

### Build Commands

```powershell
# Frontend build
.\build-frontend.ps1 -ApiUrl "https://backend-xxxxx.a.run.app/api" -ProjectId "your-project" -Push -Version "v1.0"

# Backend build
.\build-backend.ps1 -FrontendUrl "https://frontend-xxxxx.a.run.app" -ProjectId "your-project" -Push -Version "v1.0"
```

### Deploy Commands

```powershell
# Frontend deploy
gcloud run deploy powerplay-frontend `
  --image=us-central1-docker.pkg.dev/PROJECT/powerplay-stream-frontend/powerplay-stream-frontend:v1.0 `
  --region=us-central1 `
  --port=8080 `
  --allow-unauthenticated

# Backend deploy
gcloud run deploy powerplay-backend `
  --image=us-central1-docker.pkg.dev/PROJECT/powerplay-stream-backend/powerplay-stream-backend:v1.0 `
  --region=us-central1 `
  --port=5000 `
  --allow-unauthenticated `
  --set-env-vars="FRONTEND_URL=https://frontend-xxxxx.a.run.app"
```

---

## ✨ Summary

✅ **Frontend:** Nginx serving React app → Calls backend via REACT_APP_API_URL  
✅ **Backend:** Express.js → Accepts CORS from FRONTEND_URL  
✅ **Communication:** HTTPS, no proxy needed  
✅ **Scaling:** Independent scaling for each service  
✅ **Updates:** Deploy each service separately  

---

**Status:** ✅ **READY FOR CLOUD RUN DEPLOYMENT**

---

## Need Help?

- **Frontend build issues?** Check `build-frontend.ps1 -Test`
- **Backend issues?** Check `build-backend.ps1 -Test`  
- **Cloud Run issues?** Check logs: `gcloud run logs read SERVICE --region=us-central1`
- **CORS issues?** Verify `FRONTEND_URL` env var on backend

Happy deploying! 🚀
