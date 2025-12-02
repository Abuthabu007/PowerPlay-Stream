# Build Docker Images Using Google Cloud Build

Since Docker isn't installed locally, you can build your Docker images directly in the cloud using Google Cloud Build. This is **faster and requires no local setup!**

---

## 🚀 Quick Start (No Local Docker Needed)

### Step 1: Authenticate with GCP
```powershell
gcloud auth login
gcloud config set project komo-infra-479911
gcloud auth application-default login
```

### Step 2: Build Backend Image in Cloud
```powershell
gcloud builds submit --region=us-central1 --config=cloudbuild-backend.yaml
```

### Step 3: Build Frontend Image in Cloud
```powershell
gcloud builds submit --region=us-central1 --config=cloudbuild-frontend.yaml
```

**That's it!** Your images are built in the cloud and stored in Container Registry.

---

## ✅ What Happens

1. **Code uploaded** to Google Cloud Build
2. **Docker image built** on Google's servers (completely free build resources!)
3. **Image pushed** to Container Registry (gcr.io)
4. **Ready for Cloud Run deployment**

---

## 📊 Benefits of Cloud Build

| Aspect | Local Docker | Cloud Build |
|--------|--------------|-------------|
| **Setup** | Install Docker (565 MB) | Nothing! |
| **Time** | Build locally (2-5 min) | Build in cloud (1-2 min) |
| **Resources** | Uses your CPU/RAM | Uses Google's servers |
| **Cost** | Free | Free (120 min/month) |
| **Reliability** | Depends on your machine | Google's infrastructure |

---

## 🔍 Check Build Status

### View ongoing builds
```powershell
gcloud builds list --limit=10
```

### View build details
```powershell
gcloud builds log BUILD_ID
```

### View built images
```powershell
gcloud container images list --project=komo-infra-479911
```

---

## 🖼️ Verify Images in Container Registry

After successful build:

```powershell
# List all images
gcloud container images list --project=komo-infra-479911

# Describe backend image
gcloud container images describe gcr.io/komo-infra-479911/powerplay-backend

# Describe frontend image
gcloud container images describe gcr.io/komo-infra-479911/powerplay-frontend
```

---

## 📝 Complete Workflow: Build → Deploy

### 1. Build both images
```powershell
# Backend build
gcloud builds submit --region=us-central1 --config=cloudbuild-backend.yaml

# Frontend build
gcloud builds submit --region=us-central1 --config=cloudbuild-frontend.yaml
```

### 2. Deploy to Cloud Run
```powershell
# Backend
gcloud run deploy powerplay-backend `
  --image gcr.io/komo-infra-479911/powerplay-backend:latest `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --memory 512Mi `
  --max-instances 10

# Frontend
gcloud run deploy powerplay-frontend `
  --image gcr.io/komo-infra-479911/powerplay-frontend:latest `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --memory 256Mi `
  --max-instances 5
```

### 3. Get service URLs
```powershell
gcloud run services describe powerplay-backend --region us-central1 --format='value(status.url)'
gcloud run services describe powerplay-frontend --region us-central1 --format='value(status.url)'
```

---

## 🛠️ Advanced: Custom Build Configuration

You can customize the builds by editing the cloudbuild files:

**cloudbuild-backend.yaml:**
- Build backend Docker image
- Push to Container Registry
- Ready for Cloud Run

**cloudbuild-frontend.yaml:**
- Build frontend Docker image
- Push to Container Registry
- Ready for Cloud Run

---

## 📱 Monitor Build Progress

Open Cloud Console to watch builds in real-time:
https://console.cloud.google.com/cloud-build/builds

---

## ⚠️ Troubleshooting

### Build Fails with "Permission Denied"
```powershell
# Grant Cloud Build permissions
gcloud projects add-iam-policy-binding komo-infra-479911 `
  --member=serviceAccount:YOUR_PROJECT_NUMBER@cloudbuild.gserviceaccount.com `
  --role=roles/run.admin
```

### Container Registry Not Found
```powershell
# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com
```

### Can't Push to Registry
```powershell
# Configure Docker authentication
gcloud auth configure-docker gcr.io
```

---

## 🎯 Complete Deployment Script (No Local Docker)

Save this as `deploy-cloud-build.ps1`:

```powershell
# Cloud Build Deployment (No Docker Required)

$PROJECT_ID = "komo-infra-479911"
$REGION = "us-central1"
$BACKEND_IMAGE = "gcr.io/$PROJECT_ID/powerplay-backend:latest"
$FRONTEND_IMAGE = "gcr.io/$PROJECT_ID/powerplay-frontend:latest"

Write-Host "Building in Google Cloud..." -ForegroundColor Cyan

# Build backend
Write-Host "Building backend..." -ForegroundColor Yellow
gcloud builds submit --region=$REGION --config=cloudbuild-backend.yaml

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
gcloud builds submit --region=$REGION --config=cloudbuild-frontend.yaml

Write-Host "Images ready in Container Registry!" -ForegroundColor Green

# Deploy backend
Write-Host "Deploying backend..." -ForegroundColor Yellow
gcloud run deploy powerplay-backend `
  --image $BACKEND_IMAGE `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --memory 512Mi `
  --max-instances 10

# Deploy frontend
Write-Host "Deploying frontend..." -ForegroundColor Yellow
gcloud run deploy powerplay-frontend `
  --image $FRONTEND_IMAGE `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --memory 256Mi `
  --max-instances 5

# Get URLs
Write-Host "`nServices deployed!" -ForegroundColor Green
Write-Host "Backend: $(gcloud run services describe powerplay-backend --region=$REGION --format='value(status.url)')" -ForegroundColor Cyan
Write-Host "Frontend: $(gcloud run services describe powerplay-frontend --region=$REGION --format='value(status.url)')" -ForegroundColor Cyan
```

Run with:
```powershell
.\deploy-cloud-build.ps1
```

---

## ✨ Summary

**Option 1: Local Docker (Still Recommended)**
- Install Docker Desktop
- Run: `docker build ...`
- Full control, offline capable

**Option 2: Cloud Build (No Local Setup)**
- Run: `gcloud builds submit ...`
- No Docker installation needed
- Faster, uses Google's servers
- Free (120 min/month included)

**Choose Option 2 if:**
- Docker won't install on your machine
- You want to build in the cloud
- You don't want local setup

---

**Ready to build? Run:**
```powershell
gcloud builds submit --region=us-central1 --config=cloudbuild-backend.yaml
gcloud builds submit --region=us-central1 --config=cloudbuild-frontend.yaml
```
