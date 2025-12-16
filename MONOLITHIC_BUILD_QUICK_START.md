# 🐳 Monolithic Docker Build - Quick Start

## What You Get

A single Docker image containing:
- ✅ **Frontend** - React app (pre-built static files)
- ✅ **Backend** - Node.js Express server
- ✅ **Both combined** - Running on port 8080

---

## 🚀 Build in 3 Steps

### Step 1: Ensure Frontend is Built
```powershell
cd frontend
npm install
npm run build
cd ..
```

### Step 2: Build the Docker Image
```powershell
# Simple local build
docker build -t powerplay-stream:latest -f Dockerfile.monolithic .

# Or use the build script
.\build-local.ps1
```

**Build time:** 3-5 minutes (first time), 1-2 minutes (cached)

### Step 3: Test Locally
```powershell
# Run container
docker run -p 8080:8080 powerplay-stream:latest

# Test in browser
Start-Process "http://localhost:8080"

# Or test health endpoint
curl http://localhost:8080/health
```

---

## ☁️ Push to Google Cloud

### With Build Script (Recommended)
```powershell
# Set your GCP details
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# Build, test, and push
.\build-local.ps1 -Version "v1.0" -Test -Push
```

### Manual Push
```powershell
# Set variables
$ProjectId = "your-project-id"
$Region = "us-central1"
$ImageUri = "$Region-docker.pkg.dev/$ProjectId/powerplay-stream/app:latest"

# Build
docker build -t $ImageUri -f Dockerfile.monolithic .

# Authenticate
gcloud auth configure-docker "$Region-docker.pkg.dev"

# Push
docker push $ImageUri
```

---

## 📦 Available Build Scripts

### `build-local.ps1` - Full Featured
```powershell
# Build and test
.\build-local.ps1 -Test

# Build, test, and push to GCP
.\build-local.ps1 -Test -Push -Version "v1.0"

# Push without rebuilding
.\build-local.ps1 -NoBuild -Push
```

### `build-monolithic.ps1` - Simple Build & Push
```powershell
$env:GCP_PROJECT_ID = "your-project"
$env:GCP_REGION = "us-central1"

.\build-monolithic.ps1
.\build-monolithic.ps1 -Version "v1.0"
```

---

## 🌐 Deploy to Cloud Run

### From Image in Artifact Registry
```powershell
$ImageUri = "us-central1-docker.pkg.dev/your-project/powerplay-stream/app:latest"

gcloud run deploy powerplay-stream `
  --image=$ImageUri `
  --region=us-central1 `
  --port=8080 `
  --memory=512Mi `
  --allow-unauthenticated
```

### From Web Console
1. Go to https://console.cloud.google.com/run
2. Click **Create Service**
3. Select your image from Artifact Registry
4. Configure: Port 8080, Memory 512Mi
5. Click **Create**

---

## 📊 Image Specifications

| Property | Value |
|----------|-------|
| Base | Node 18 Alpine |
| Size | ~850MB |
| Build time | 3-5 min (first), 1-2 min (cached) |
| Port | 8080 |
| Architecture | Multi-stage build |
| Compression | Layer caching |

---

## ✅ Verification

### Check Local Image
```powershell
docker images | findstr powerplay
docker inspect powerplay-stream:latest
```

### Check in GCP
```powershell
gcloud artifacts docker images list us-central1-docker.pkg.dev/your-project/powerplay-stream
```

### Check Running Container
```powershell
docker ps
docker logs container-id
docker stats container-id
```

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| **"frontend/build not found"** | Run `npm run build` in frontend/ |
| **"Cannot find module"** | Run `npm install` in backend/ |
| **"Docker not running"** | Start Docker Desktop |
| **"Permission denied"** | Run `gcloud auth login` |
| **"Port 8080 in use"** | Use different port: `-p 9000:8080` |

---

## 📋 Build Checklist

- [ ] Frontend built: `frontend/build/` exists
- [ ] Backend dependencies: `backend/node_modules/` exists or npm ready
- [ ] Docker running
- [ ] GCP project ID set (for Cloud Run)
- [ ] Image builds without errors
- [ ] Image runs locally on port 8080
- [ ] Health endpoint responds: `/health`
- [ ] Image pushed to registry (if deploying)
- [ ] Cloud Run deployment successful

---

## 🔗 Documentation

**Detailed Guide:** `BUILD_MONOLITHIC_IMAGE.md`  
**Build Script:** `build-local.ps1`  
**GCP Script:** `build-monolithic.ps1`  

---

## 💡 Tips

✅ Frontend is cached after first build (changes don't trigger rebuild)  
✅ Use `-NoBuild` to skip build and just push:  
```powershell
.\build-local.ps1 -NoBuild -Push
```

✅ Test locally before pushing:  
```powershell
.\build-local.ps1 -Test
```

✅ View build layers to optimize:  
```powershell
docker history powerplay-stream:latest
```

---

## 🚀 Recommended Workflow

```powershell
# 1. Make changes to code
# 2. Build frontend if changed
cd frontend && npm run build && cd ..

# 3. Build and test locally
.\build-local.ps1 -Test

# 4. When ready for production
$env:GCP_PROJECT_ID = "your-project"
$env:GCP_REGION = "us-central1"
.\build-local.ps1 -Test -Push -Version "v1.0"

# 5. Deploy to Cloud Run
gcloud run deploy powerplay-stream `
  --image=us-central1-docker.pkg.dev/your-project/powerplay-stream/app:v1.0 `
  --region=us-central1 `
  --port=8080
```

---

**Status:** ✅ Ready to Build  
**Time to Build:** ~5 minutes  
**Time to Deploy:** ~2 minutes  

Start building: `.\build-local.ps1`
