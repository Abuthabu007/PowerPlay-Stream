# 🚀 Microservices Quick Start - 5 Minutes

> Deploy frontend + backend to Cloud Run separately

---

## 📋 What You Get

```
Frontend (Nginx)     Backend (Express)
  :8080                 :5000
   │                      │
   └──── HTTPS ────────────┘
```

✅ Independent scaling  
✅ Separate deployments  
✅ Easy updates  
✅ Production-ready CORS  

---

## ⚡ 5-Minute Setup

### 1. Set GCP Project (1 min)

```powershell
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# Check it
gcloud config list | findstr project
```

### 2. Enable APIs (2 min)

```powershell
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Create Repositories (1 min)

```powershell
gcloud artifacts repositories create powerplay-stream-frontend `
  --repository-format=docker --location=us-central1

gcloud artifacts repositories create powerplay-stream-backend `
  --repository-format=docker --location=us-central1
```

### 4. Deploy Everything (1 min each = 3 min for both)

**Frontend:**
```powershell
.\build-frontend.ps1 `
  -ApiUrl "https://backend-xxxxx.a.run.app/api" `
  -ProjectId $env:GCP_PROJECT_ID `
  -Push -Version "v1.0"

gcloud run deploy powerplay-frontend `
  --image=us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream-frontend/powerplay-stream-frontend:v1.0 `
  --region=us-central1 --port=8080 --allow-unauthenticated
```

**Backend:**
```powershell
$FRONTEND_URL = "https://powerplay-frontend-xxxxx.a.run.app"

.\build-backend.ps1 `
  -FrontendUrl $FRONTEND_URL `
  -ProjectId $env:GCP_PROJECT_ID `
  -Push -Version "v1.0"

gcloud run deploy powerplay-backend `
  --image=us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream-backend/powerplay-stream-backend:v1.0 `
  --region=us-central1 --port=5000 --allow-unauthenticated `
  --set-env-vars="FRONTEND_URL=$FRONTEND_URL"
```

**Done!** ✅

---

## 🔗 Update Frontend with Real Backend URL

After backend is deployed:

```powershell
$BACKEND_URL = "https://powerplay-backend-xxxxx.a.run.app/api"

.\build-frontend.ps1 `
  -ApiUrl $BACKEND_URL `
  -ProjectId $env:GCP_PROJECT_ID `
  -Push -Version "v1.1"

gcloud run deploy powerplay-frontend `
  --image=us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream-frontend/powerplay-stream-frontend:v1.1 `
  --region=us-central1 --port=8080 --allow-unauthenticated
```

---

## ✅ Verify

```powershell
# Test frontend
curl https://powerplay-frontend-xxxxx.a.run.app

# Test backend health
curl https://powerplay-backend-xxxxx.a.run.app/health

# View logs
gcloud run logs read powerplay-backend --region=us-central1 --follow
```

---

## 📚 Full Guide

See **MICROSERVICES_DEPLOYMENT.md** for:
- Detailed steps
- Troubleshooting
- Environment variables
- Cost optimization
- Update procedures

---

**That's it!** 🎉

Your application is now running as 2 separate Cloud Run services.
