# Monolithic Docker Image - IAP Deployment Guide

## Summary of Changes

✅ Made `/api/user-info` and `/api/users/me/info` endpoints **PUBLIC** (no auth required)  
✅ Added **IAP authentication middleware** to process Authorization headers  
✅ Added fallback support for dev mode (`DISABLE_IAP_VALIDATION=true`)  
✅ Both frontend and backend run in a **single Cloud Run service** on port 8080

---

## Architecture

```
Internet
    ↓
Load Balancer with IAP
    ↓
Cloud Run Service (powerplay-stream)
├── Port: 8080
├── Frontend: React static files (/)
└── Backend: Express API (/api/*)
    ├── IAP middleware processes Authorization header
    ├── /api/user-info (PUBLIC)
    ├── /api/users/me/info (PUBLIC)
    └── All other API routes as before
```

---

## Deployment Steps

### 1. Build Docker Image

```powershell
# Ensure frontend is built
cd frontend
npm install
npm run build
cd ..

# Build the image
docker build -t powerplay-stream:latest -f Dockerfile.monolithic .

# Test locally
docker run -p 8080:8080 -e DISABLE_IAP_VALIDATION=true powerplay-stream:latest

# Visit http://localhost:8080
```

### 2. Push to Artifact Registry

```powershell
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# Tag
docker tag powerplay-stream:latest `
  $env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:latest

# Push
docker push $env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:latest
```

### 3. Deploy to Cloud Run

```powershell
gcloud run deploy powerplay-stream `
  --image=$env:GCP_REGION-docker.pkg.dev/$env:GCP_PROJECT_ID/powerplay-stream/app:latest `
  --region=$env:GCP_REGION `
  --port=8080 `
  --memory=512Mi `
  --set-env-vars=NODE_ENV=production `
  --set-env-vars=DISABLE_IAP_VALIDATION=false `
  --set-env-vars=GCP_PROJECT_ID=$env:GCP_PROJECT_ID
```

### 4. Set Up Load Balancer with IAP

1. In GCP Console, go to **Compute Engine → Load balancing**
2. Create a new Load Balancer (HTTPS)
3. Configure backend: Point to your Cloud Run service
4. Enable **Identity-Aware Proxy (IAP)**
5. Configure OAuth consent screen and credentials
6. Set allowed users in IAP settings

---

## How It Works Now

### Without IAP (Dev Mode)

```bash
docker run -p 8080:8080 -e DISABLE_IAP_VALIDATION=true powerplay-stream:latest
```

- All requests use dev user (auto-authenticated)
- Frontend loads and can call `/api/user-info`
- Returns dev user data

### With IAP Enabled

1. User visits https://your-domain.com (through Load Balancer)
2. Load Balancer + IAP validates user identity
3. IAP injects `Authorization: Bearer <JWT>` header
4. Request reaches Cloud Run service
5. `iapAuth` middleware processes the header (sets `req.user`)
6. `/api/user-info` endpoint returns user data
7. Frontend displays user info

---

## Troubleshooting

### Issue: /api/user-info returns 401

**Cause:** IAP not enabled or Authorization header not being passed

**Fix:**
1. Verify IAP is enabled in Load Balancer settings
2. Check Cloud Run logs: `gcloud run logs read powerplay-stream --limit=50`
3. Ensure `DISABLE_IAP_VALIDATION=false` on Cloud Run

### Issue: Page loads but user-info is pending

**Cause:** Authorization header is missing

**Solution:**
1. Check that IAP is configured at the Load Balancer level
2. Verify OAuth 2.0 credential is set in IAP console
3. Check that your email is in the "IAP-Secured Web App User" role

### Testing IAP Locally

For local testing, use:
```powershell
docker run -p 8080:8080 `
  -e DISABLE_IAP_VALIDATION=true `
  -e NODE_ENV=development `
  powerplay-stream:latest
```

---

## Environment Variables

| Variable | Value | Location |
|----------|-------|----------|
| `NODE_ENV` | `production` | Cloud Run |
| `DISABLE_IAP_VALIDATION` | `false` | Cloud Run |
| `GCP_PROJECT_ID` | Your project ID | Cloud Run |
| `PORT` | `8080` | Cloud Run |

---

## Key Code Changes

### backend/src/index.js

✅ Added IAP middleware globally:
```javascript
app.use(iapAuth);
```

✅ Made endpoints public (removed `iapAuth` from route):
```javascript
app.get('/api/user-info', (req, res) => {
  // Now handles both cases:
  // - With IAP: req.user is set by middleware
  // - Dev mode: returns dev user
  if (req.user) {
    res.json({ success: true, data: req.user });
  }
});
```

---

## Single Cloud Run Service Benefits

✅ **Simpler deployment** - One service to manage  
✅ **Better performance** - No cross-service latency  
✅ **Easier debugging** - All logs in one place  
✅ **Lower cost** - Single resource allocation  
✅ **Perfect for monolithic apps** - Frontend + Backend together  

---

## Next Steps

1. **Rebuild and test locally**
   ```powershell
   .\build-local.ps1 -Test
   ```

2. **Push to Cloud**
   ```powershell
   .\build-local.ps1 -Test -Push -Version "v1.0"
   ```

3. **Deploy to Cloud Run** (using command above)

4. **Configure Load Balancer + IAP** in GCP Console

5. **Test the app** through the IAP-protected Load Balancer URL
