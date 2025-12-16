# Complete Monolithic Docker Build Guide

## 📖 Overview

PowerPlay-Stream is now ready to be built as a **single monolithic Docker image** that combines both frontend and backend into one deployable unit.

---

## 🎯 What Is a Monolithic Docker Image?

A single Docker image containing:
```
┌─────────────────────────────────────┐
│        Docker Image (850MB)         │
├─────────────────────────────────────┤
│  Frontend (React - Static Files)    │
│  ├─ HTML, CSS, JS                   │
│  ├─ Assets                          │
│  └─ Served by Node.js server        │
├─────────────────────────────────────┤
│  Backend (Node.js/Express)          │
│  ├─ API Routes                      │
│  ├─ Business Logic                  │
│  └─ Database/Cloud Integration      │
├─────────────────────────────────────┤
│  Runs on Port: 8080                 │
└─────────────────────────────────────┘
```

---

## 🚀 Quick Start (5 minutes)

### Fastest Way to Build

```powershell
# 1. Navigate to project root
cd d:\GCP-Project\PowerPlayapp\PowerPlay-Stream

# 2. Build
docker build -t powerplay-stream:latest -f Dockerfile.monolithic .

# 3. Run
docker run -p 8080:8080 powerplay-stream:latest

# 4. Test
Start-Process "http://localhost:8080"
```

### Using the Build Script

```powershell
# Simple build
.\build-local.ps1

# Build and test
.\build-local.ps1 -Test

# Build, test, and push to GCP
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"
.\build-local.ps1 -Test -Push -Version "v1.0"
```

---

## 📋 Prerequisites

✅ **Docker Desktop installed and running**
```powershell
docker --version
docker ps  # Should work without errors
```

✅ **Frontend pre-built**
```powershell
# Ensure frontend/build/ exists
Test-Path "frontend/build"

# If not, build it
cd frontend
npm install
npm run build
cd ..
```

✅ **Backend packages ready**
```powershell
# Backend should have package.json
Test-Path "backend/package.json"
```

---

## 🔨 Build Methods

### Method 1: Simple Docker Build (Recommended for Local)

```powershell
# Build with default tag
docker build -t powerplay-stream:latest -f Dockerfile.monolithic .

# Build with version tag
docker build -t powerplay-stream:v1.0 -f Dockerfile.monolithic .
```

**Pros:** Simple, fast, works offline  
**Cons:** Only on local machine  

---

### Method 2: Build Script (Recommended for Most Cases)

```powershell
# Show help
.\build-local.ps1 -?

# Examples:
.\build-local.ps1                              # Build only
.\build-local.ps1 -Test                        # Build + test
.\build-local.ps1 -Test -Push                  # Build + test + push
.\build-local.ps1 -Version "v1.0" -Test -Push  # With version tag
```

**Features:**
- ✅ Validates Docker is running
- ✅ Checks frontend build exists
- ✅ Shows progress and status
- ✅ Optional testing
- ✅ Optional push to GCP
- ✅ Color-coded output

**Pros:** Feature-rich, automated, safe  
**Cons:** PowerShell only  

---

### Method 3: GCP Build Script (For Cloud Deployment)

```powershell
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# Build and push to Artifact Registry
.\build-monolithic.ps1
.\build-monolithic.ps1 -Version "v1.0"
```

**Pros:** Integrated with GCP, automatic authentication  
**Cons:** Requires GCP setup  

---

## 📦 Build Details

### Multi-Stage Build Process

The `Dockerfile.monolithic` uses a 3-stage build process:

#### Stage 1: Frontend Builder
```dockerfile
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build
# Output: /app/frontend/build/
```

#### Stage 2: Backend Builder
```dockerfile
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src ./src
# Output: /app/backend/ (with dependencies)
```

#### Stage 3: Production
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy from stages
COPY --from=backend-builder /app/backend ./backend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Install and start
RUN npm ci --only=production
CMD ["node", "src/index.js"]
```

### Build Time Analysis

| Step | Time | Cache | Details |
|------|------|-------|---------|
| Frontend install | 1-2 min | Depends on changes | npm install |
| Frontend build | 30-60 sec | Depends on source | npm run build |
| Backend install | 30-60 sec | Yes | npm ci --only |
| Final assembly | <10 sec | Yes | Copy files |
| **Total (first)** | **3-5 min** | N/A | Full build |
| **Total (cached)** | **1-2 min** | Yes | Only changed layers |

---

## 🧪 Testing the Image

### Test Locally

```powershell
# Start container
docker run -d `
  -p 8080:8080 `
  -e NODE_ENV=production `
  --name powerplay-test `
  powerplay-stream:latest

# Wait for startup
Start-Sleep -Seconds 3

# Test endpoints
curl http://localhost:8080/health              # Health check
curl http://localhost:8080/                    # Frontend
curl http://localhost:8080/api/videos          # API (may need auth)

# View logs
docker logs powerplay-test

# Stop
docker stop powerplay-test
docker rm powerplay-test
```

### Or Use Build Script Test

```powershell
# Automatic testing
.\build-local.ps1 -Test
```

---

## ☁️ Deploy to Google Cloud

### Step 1: Set Up GCP

```powershell
# Login
gcloud auth login

# Set project
gcloud config set project your-project-id

# Set variables
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# Verify
gcloud config list
```

### Step 2: Build and Push

```powershell
# Option A: Using build script (recommended)
.\build-local.ps1 -Test -Push -Version "v1.0"

# Option B: Manual
$ImageUri = "$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:v1.0"
docker build -t $ImageUri -f Dockerfile.monolithic .
gcloud auth configure-docker "$env:GCP_REGION-docker.pkg.dev"
docker push $ImageUri
```

### Step 3: Deploy to Cloud Run

```powershell
# Using gcloud CLI
$ImageUri = "us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:v1.0"

gcloud run deploy powerplay-stream `
  --image=$ImageUri `
  --region=us-central1 `
  --port=8080 `
  --memory=512Mi `
  --cpu=1 `
  --allow-unauthenticated

# Get the URL
gcloud run services describe powerplay-stream --region=us-central1 --format='value(status.url)'
```

### Or Use Web Console

1. **Open:** https://console.cloud.google.com/run
2. **Click:** Create Service
3. **Select:** Deploy one revision from existing image
4. **Choose:** Your image from Artifact Registry
5. **Configure:**
   - Service name: `powerplay-stream`
   - Region: `us-central1`
   - Port: `8080`
   - Memory: `512 Mi`
6. **Click:** Create

---

## 📊 Image Management

### View Local Images

```powershell
# List all images
docker images

# View specific image
docker images powerplay-stream

# View image details
docker inspect powerplay-stream:latest
```

### View Cloud Images

```powershell
# List images in Artifact Registry
gcloud artifacts docker images list `
  us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream

# View image details
gcloud artifacts docker images describe `
  "us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:latest"
```

### Clean Up

```powershell
# Remove local image
docker rmi powerplay-stream:latest

# Remove unused images
docker image prune

# Remove all images (careful!)
docker image prune -a
```

---

## 🔍 Verify Builds

### Check if Build Succeeded

```powershell
# Image exists
docker images powerplay-stream

# Run and verify
docker run --rm powerplay-stream:latest node --version
```

### Check Image Size

```powershell
# Local
docker images powerplay-stream --format "{{.Size}}"

# Cloud
gcloud artifacts docker images list `
  us-central1-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream `
  --format="value(image,create_time)" | Sort-Object -Descending
```

---

## 🚨 Troubleshooting

### Build Fails

```
Error: Cannot find frontend/build/
→ Solution: cd frontend && npm run build && cd ..

Error: Cannot find module
→ Solution: cd backend && npm install && cd ..

Error: Docker not running
→ Solution: Start Docker Desktop
```

### Push Fails

```
Error: Authentication failed
→ Solution: gcloud auth login

Error: Artifact Registry not found
→ Solution: gcloud artifacts repositories create powerplay-stream ...

Error: Permission denied
→ Solution: Check IAM roles in GCP console
```

### Runtime Issues

```
Error: Port 8080 already in use
→ Solution: docker run -p 9000:8080 ...

Error: Container exits immediately
→ Solution: docker logs container-id

Error: API not responding
→ Solution: Check backend configuration, database connection
```

---

## 📋 Complete Workflow

### Development → Production

```powershell
# 1. Make code changes
# ...

# 2. Rebuild frontend if changed
cd frontend
npm run build
cd ..

# 3. Build locally
.\build-local.ps1 -Test

# 4. Fix any issues
# ...

# 5. Set up GCP
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# 6. Push to cloud
.\build-local.ps1 -Test -Push -Version "v1.0"

# 7. Deploy to Cloud Run
gcloud run deploy powerplay-stream `
  --image=us-central1-docker.pkg.dev/your-project-id/powerplay-stream/app:v1.0 `
  --region=us-central1 `
  --port=8080

# 8. Verify deployment
Start-Process "https://console.cloud.google.com/run"
```

---

## 📞 Support Files

| File | Purpose |
|------|---------|
| `Dockerfile.monolithic` | Main Docker build file |
| `build-local.ps1` | Feature-rich build script |
| `build-monolithic.ps1` | GCP build & push script |
| `MONOLITHIC_BUILD_QUICK_START.md` | Quick reference |
| `BUILD_MONOLITHIC_IMAGE.md` | Detailed guide (this file) |

---

## ✅ Verification Checklist

- [ ] Docker installed: `docker --version`
- [ ] Frontend built: `Test-Path frontend/build`
- [ ] Backend ready: `Test-Path backend/package.json`
- [ ] Image builds: `docker build ...` succeeds
- [ ] Container runs: `docker run ...` starts
- [ ] Health check works: `curl /health`
- [ ] Frontend loads: Browser shows UI
- [ ] API responds: Check API endpoints
- [ ] Image pushes: `docker push ...` succeeds
- [ ] Cloud Run deploys: Service is active

---

## 🎯 Success Criteria

**Local Build:**
- ✅ Image builds in < 5 minutes
- ✅ Container starts on port 8080
- ✅ Frontend loads in browser
- ✅ Health endpoint responds

**Cloud Deployment:**
- ✅ Image pushes to Artifact Registry
- ✅ Cloud Run service creates successfully
- ✅ Service URL is accessible
- ✅ Application responds to requests

---

## 💡 Best Practices

✅ **Always test locally before pushing**
```powershell
.\build-local.ps1 -Test
```

✅ **Use version tags**
```powershell
.\build-local.ps1 -Version "v1.0.0" -Push
```

✅ **Keep frontend and backend in sync**
```powershell
# Both should be working in their respective directories
cd frontend && npm test && cd ..
cd backend && npm test && cd ..
```

✅ **Monitor Cloud Run logs**
```powershell
gcloud run logs read powerplay-stream --limit=50
```

✅ **Regular cleanup**
```powershell
docker image prune -a  # Remove unused images
```

---

**Status:** ✅ Ready to Build  
**Build Time:** ~5 minutes  
**Deployment Time:** ~2-3 minutes  
**Next Step:** Run `.\build-local.ps1` or see quick start guide
