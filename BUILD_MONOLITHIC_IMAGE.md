# Build Monolithic Docker Image - Complete Guide

## Overview

This guide walks you through building a single Docker image that packages both the frontend and backend as a monolithic application.

---

## 📋 Prerequisites

✅ Docker installed and running  
✅ Node.js 18+ (optional, Docker handles it)  
✅ Both `frontend/build/` (pre-built) and `backend/` directories present  
✅ All dependencies in `package.json` files  

---

## 🚀 Quick Build (Local Testing)

### Option 1: Simple Local Build
```powershell
# From project root: PowerPlay-Stream/

# Build with simple tag
docker build -t powerplay-stream:latest -f Dockerfile.monolithic .

# Run locally
docker run -p 8080:8080 powerplay-stream:latest

# Test in browser
Start-Process "http://localhost:8080"
```

**Build time:** 3-5 minutes (first time), 1-2 minutes (cached)

---

## ☁️ Build for Google Cloud

### Step 1: Set Environment Variables
```powershell
# Set your GCP project details
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"
$env:VERSION = "v1.0"

# Verify
Write-Host "Project: $env:GCP_PROJECT_ID"
Write-Host "Region: $env:GCP_REGION"
```

### Step 2: Authenticate with Google Cloud
```powershell
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project $env:GCP_PROJECT_ID

# Configure Docker authentication
gcloud auth configure-docker "$env:GCP_REGION-docker.pkg.dev"
```

### Step 3: Build the Image
```powershell
# Navigate to project root
cd d:\GCP-Project\PowerPlayapp\PowerPlay-Stream

# Build with Artifact Registry tag
$ImageUri = "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:$env:VERSION"

docker build -t $ImageUri -f Dockerfile.monolithic .

# Check image was created
docker images | findstr powerplay
```

**Expected output:**
```
REPOSITORY                                             TAG    IMAGE ID       CREATED        SIZE
us-central1-docker.pkg.dev/your-project/...           v1.0   abc123def456   2 minutes ago  850MB
```

### Step 4: Push to Artifact Registry
```powershell
# Push to GCP
docker push $ImageUri

Write-Host "Image pushed: $ImageUri" -ForegroundColor Green
```

---

## 🔧 Using the Build Script

The repository includes `build-monolithic.ps1` for automated building:

### Automated Build & Push
```powershell
# Set environment variables
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# Run build script
.\build-monolithic.ps1

# Or with specific version
.\build-monolithic.ps1 -Version "v1.0"
```

**What it does:**
- ✅ Verifies Docker is running
- ✅ Authenticates with GCP
- ✅ Builds the image
- ✅ Pushes to Artifact Registry
- ✅ Shows success message

---

## 📦 What's in the Monolithic Image

### Stage 1: Frontend Builder
```
- Node 18 Alpine base
- Installs npm dependencies
- Builds React app (npm run build)
- Output: /app/frontend/build/
```

### Stage 2: Backend Builder
```
- Node 18 Alpine base
- Installs production dependencies only
- Copies source code
- Output: /app/backend/src/
```

### Stage 3: Production Runtime
```
- Node 18 Alpine base (minimal size)
- Combines both frontend and backend
- Frontend served as static files
- Backend runs as Node server on port 8080
- Size: ~850MB
```

---

## 🧪 Test the Built Image Locally

### Run Locally
```powershell
# Start container
docker run -d `
  -p 8080:8080 `
  -e NODE_ENV=production `
  -e DISABLE_IAP_VALIDATION=true `
  --name powerplay-test `
  powerplay-stream:latest

# Wait a moment for startup
Start-Sleep -Seconds 3

# Check logs
docker logs powerplay-test

# Test health endpoint
curl http://localhost:8080/health

# Open in browser
Start-Process "http://localhost:8080"
```

### Stop Container
```powershell
docker stop powerplay-test
docker rm powerplay-test
```

---

## 🌐 Deploy to Cloud Run

### Option A: Using Web Console
1. Open: https://console.cloud.google.com/run
2. Click **Create Service**
3. Select **Deploy one revision from an existing container image**
4. Click **Select** → **Artifact Registry** → Choose your image
5. Configure:
   - Service name: `powerplay-stream`
   - Region: `us-central1`
   - Port: `8080`
   - Memory: `512 Mi` (minimum)
   - CPU: `1`
6. Click **Create**

### Option B: Using gcloud CLI
```powershell
# Set variables
$env:SERVICE_NAME = "powerplay-stream"
$ImageUri = "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:$env:VERSION"

# Deploy
gcloud run deploy $env:SERVICE_NAME `
  --image=$ImageUri `
  --region=$env:GCP_REGION `
  --port=8080 `
  --memory=512Mi `
  --cpu=1 `
  --allow-unauthenticated

# Get service URL
gcloud run services describe $env:SERVICE_NAME --region=$env:GCP_REGION --format='value(status.url)'
```

---

## 📊 Image Build Time & Size

| Stage | Time | Size | Note |
|-------|------|------|------|
| Frontend build | 1-2 min | 450MB | npm install + build |
| Backend build | 1 min | 200MB | npm ci (production) |
| Final image | - | ~850MB | Optimized with Alpine |
| First build | 3-5 min | - | No cache |
| Cached build | 1-2 min | - | Reuses layers |

**Tips to reduce size:**
- Frontend build is cached: ~1 min if not changed
- Backend build is cached: ~30 sec if not changed

---

## 🔍 Verify Build Success

### Check Docker Image
```powershell
# List images
docker images | findstr powerplay

# Inspect image
docker inspect powerplay-stream:latest | ConvertFrom-Json | .[0] | Select-Object -Property `
  RepoTags, Size, Created, Architecture

# View layers
docker history powerplay-stream:latest
```

### Check Artifact Registry
```powershell
# List images in Artifact Registry
gcloud artifacts docker images list `
  $env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream

# Get image details
gcloud artifacts docker images describe `
  "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:latest"
```

---

## 🚨 Troubleshooting

### Build Fails: "frontend/build/ not found"
**Problem:** Frontend hasn't been built yet
```powershell
# Build frontend first
cd frontend
npm install
npm run build
cd ..

# Then build Docker image
docker build -t powerplay-stream:latest -f Dockerfile.monolithic .
```

### Build Fails: "Cannot find module..."
**Problem:** Missing npm dependencies
```powershell
# Install backend dependencies
cd backend
npm install
cd ..

# Rebuild image
docker build --no-cache -t powerplay-stream:latest -f Dockerfile.monolithic .
```

### Push Fails: "Permission denied"
**Problem:** Not authenticated with GCP
```powershell
# Re-authenticate
gcloud auth login
gcloud auth configure-docker "$env:GCP_REGION-docker.pkg.dev"

# Retry push
docker push $ImageUri
```

### Image won't start: "Port already in use"
**Problem:** Port 8080 is already in use
```powershell
# Use different port
docker run -p 9000:8080 powerplay-stream:latest

# Or kill existing container
docker stop container_name
docker rm container_name
```

---

## 📝 Build Script Template (Windows)

If you want to create a custom build script:

```powershell
#!/usr/bin/env pwsh
param(
    [string]$Version = "latest",
    [switch]$Push = $false,
    [switch]$Test = $false
)

$ProjectId = $env:GCP_PROJECT_ID
$Region = $env:GCP_REGION

if (-not $ProjectId) {
    Write-Error "GCP_PROJECT_ID environment variable not set"
    exit 1
}

$ImageUri = "$Region-docker.pkg.dev/$ProjectId/powerplay-stream/app:$Version"

Write-Host "Building: $ImageUri" -ForegroundColor Green

# Build
docker build -t $ImageUri -f Dockerfile.monolithic .
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

# Test if requested
if ($Test) {
    Write-Host "Testing container..." -ForegroundColor Blue
    docker run --rm -p 8080:8080 --name powerplay-test $ImageUri &
    Start-Sleep -Seconds 5
    $response = curl -s http://localhost:8080/health
    docker stop powerplay-test 2>$null
    Write-Host "Test result: $response" -ForegroundColor Green
}

# Push if requested
if ($Push) {
    Write-Host "Pushing to Artifact Registry..." -ForegroundColor Blue
    gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet
    docker push $ImageUri
    if ($LASTEXITCODE -ne 0) { Write-Error "Push failed"; exit 1 }
}

Write-Host "✅ Complete: $ImageUri" -ForegroundColor Green
```

Save as `build.ps1` and run:
```powershell
.\build.ps1 -Version "v1.0" -Push -Test
```

---

## 🔐 Security Considerations

### For Development
```powershell
# Allow any user (not authenticated)
docker run -e DISABLE_IAP_VALIDATION=true powerplay-stream:latest
```

### For Production
```powershell
# Enforce authentication (recommended)
docker run -e DISABLE_IAP_VALIDATION=false powerplay-stream:latest

# Or use Cloud Run IAP
gcloud run deploy powerplay-stream --no-allow-unauthenticated
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8080
DISABLE_IAP_VALIDATION=false
GCP_PROJECT_ID=your-project
VIRUSTOTAL_API_KEY=your_key (if using virus scanning)
CLAMAV_HOST=optional
```

---

## 📋 Complete Build Workflow

### 1️⃣ Prepare
```powershell
# Set environment
$env:GCP_PROJECT_ID = "your-project"
$env:GCP_REGION = "us-central1"

# Ensure frontend is built
if (-not (Test-Path "frontend/build")) {
    cd frontend
    npm install
    npm run build
    cd ..
}
```

### 2️⃣ Build
```powershell
# Build image
$ImageUri = "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:latest"
docker build -t $ImageUri -f Dockerfile.monolithic .
```

### 3️⃣ Test Locally
```powershell
# Test image
docker run -p 8080:8080 $ImageUri
# Test in browser: http://localhost:8080
```

### 4️⃣ Push
```powershell
# Authenticate
gcloud auth configure-docker "$env:GCP_REGION-docker.pkg.dev"

# Push
docker push $ImageUri
```

### 5️⃣ Deploy
```powershell
# Deploy to Cloud Run
gcloud run deploy powerplay-stream `
  --image=$ImageUri `
  --region=$env:GCP_REGION `
  --port=8080 `
  --memory=512Mi
```

---

## ✅ Verification Checklist

- [ ] Docker image builds without errors
- [ ] Image is under 1GB in size
- [ ] Image runs locally on port 8080
- [ ] Health endpoint works: `/health`
- [ ] Frontend loads in browser
- [ ] Image pushes to Artifact Registry
- [ ] Image deploys to Cloud Run
- [ ] Production deployment accessible
- [ ] Logs show no errors

---

## 📞 Next Steps

1. **Build:** `docker build -t powerplay-stream -f Dockerfile.monolithic .`
2. **Test:** `docker run -p 8080:8080 powerplay-stream`
3. **Deploy:** Run `build-monolithic.ps1` or use gcloud CLI
4. **Verify:** Check Cloud Run dashboard

---

**Status:** ✅ Ready to Build  
**Build Time:** ~5 minutes (first), ~2 minutes (cached)  
**Image Size:** ~850MB  
**Deployment Target:** Cloud Run, Docker, Kubernetes
