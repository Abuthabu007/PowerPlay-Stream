# Cloud Deployment - Quick Start Guide

## Status: Ready for Cloud Deployment ✅

Your PowerPlay Stream application is fully prepared for Google Cloud Platform deployment. Here's what's been completed:

### Pre-Deployment Checklist ✅

- [x] Backend code updated for PostgreSQL (Cloud SQL)
- [x] PostgreSQL driver (`pg`, `pg-hstore`) installed in backend
- [x] Database configuration supports automatic PostgreSQL detection
- [x] Docker images configured and ready
- [x] Environment variables prepared in `.env`
- [x] Deployment scripts created (Bash & PowerShell)

---

## Deployment in 3 Steps

### Step 1: Install Google Cloud SDK

**Windows (via Chocolatey):**
```powershell
choco install google-cloud-sdk
```

Or download from: https://cloud.google.com/sdk/docs/install-gcloud-cli

**Verify installation:**
```powershell
gcloud --version
gcloud --version
# Should show: Google Cloud SDK ... with Python version
```

### Step 2: Authenticate with GCP

```powershell
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project komo-infra-479911

# Verify authentication
gcloud auth list
gcloud config get-value project
```

### Step 3: Run Deployment Script

**Option A: Using PowerShell Script (Recommended for Windows)**
```powershell
# From project root directory
.\deploy.ps1
```

**Option B: Manual Deployment (if script fails)**

```powershell
# 1. Configure Docker registry
gcloud auth configure-docker gcr.io

# 2. Build backend
cd backend
docker build -t gcr.io/komo-infra-479911/powerplay-backend:latest .
cd ..

# 3. Build frontend
cd frontend
docker build -t gcr.io/komo-infra-479911/powerplay-frontend:latest .
cd ..

# 4. Push images
docker push gcr.io/komo-infra-479911/powerplay-backend:latest
docker push gcr.io/komo-infra-479911/powerplay-frontend:latest

# 5. Deploy backend
gcloud run deploy powerplay-backend `
  --image gcr.io/komo-infra-479911/powerplay-backend:latest `
  --region us-central1 `
  --project komo-infra-479911 `
  --allow-unauthenticated `
  --port 8080 `
  --memory 1Gi `
  --set-env-vars="NODE_ENV=production,CLOUD_SQL_HOST=34.136.51.9,CLOUD_SQL_PORT=5432,CLOUD_SQL_DATABASE=video_metadata"

# 6. Get backend URL
$BACKEND_URL = gcloud run services describe powerplay-backend --region us-central1 --format='value(status.url)'

# 7. Deploy frontend
gcloud run deploy powerplay-frontend `
  --image gcr.io/komo-infra-479911/powerplay-frontend:latest `
  --region us-central1 `
  --project komo-infra-479911 `
  --allow-unauthenticated `
  --port 3000 `
  --memory 512Mi `
  --set-env-vars="REACT_APP_API_URL=$BACKEND_URL"

# 8. View services
gcloud run services list --region us-central1
```

---

## Post-Deployment Verification

After deployment completes, verify everything is working:

### Check Deployed Services

```powershell
# List all services
gcloud run services list --region us-central1 --project komo-infra-479911

# Get backend URL
gcloud run services describe powerplay-backend `
  --region us-central1 `
  --project komo-infra-479911 `
  --format='value(status.url)'

# Get frontend URL
gcloud run services describe powerplay-frontend `
  --region us-central1 `
  --project komo-infra-479911 `
  --format='value(status.url)'
```

### Test API Endpoints

```powershell
$BACKEND_URL = "https://your-backend-url.run.app"

# Test backend health
Invoke-WebRequest -Uri "$BACKEND_URL/health" -Method GET

# Get videos
$response = Invoke-RestMethod -Uri "$BACKEND_URL/api/videos" -Method GET
$response | ConvertTo-Json | Write-Host
```

### View Logs

```powershell
# Real-time backend logs
gcloud run logs read powerplay-backend --region us-central1 --follow

# Last 50 lines
gcloud run logs read powerplay-backend --region us-central1 --limit 50

# Search for errors
gcloud run logs read powerplay-backend --region us-central1 --limit 100 | Select-String "ERROR"
```

---

## Configuration Reference

### Environment Variables Set During Deployment

**Backend Service:**
- `NODE_ENV`: production
- `CLOUD_SQL_HOST`: 34.136.51.9
- `CLOUD_SQL_PORT`: 5432
- `CLOUD_SQL_DATABASE`: video_metadata
- `CLOUD_SQL_USER`: postgres (set via .env)
- `CLOUD_SQL_PASSWORD`: (set via .env)
- `GOOGLE_CLOUD_PROJECT`: komo-infra-479911
- `FRONTEND_URL`: https://powerplay-frontend-xxxx.run.app

**Frontend Service:**
- `REACT_APP_API_URL`: https://powerplay-backend-xxxx.run.app/api

### Database Configuration

The backend automatically detects PostgreSQL based on `CLOUD_SQL_PORT`:
- **Port 5432** → PostgreSQL dialect (Cloud SQL)
- **Port 3306** → MySQL dialect
- **No port** → SQLite (local development)

---

## Troubleshooting

### Issue: Backend won't connect to Cloud SQL

**Solution:** Verify Cloud SQL instance is accessible

```powershell
# Check Cloud SQL instance status
gcloud sql instances describe cloudsql-instance --project=komo-infra-479911

# Check if database exists
gcloud sql databases list --instance=cloudsql-instance --project=komo-infra-479911

# Check user permissions
gcloud sql users list --instance=cloudsql-instance --project=komo-infra-479911
```

### Issue: Frontend can't reach backend API

**Solution:** Check CORS configuration and environment variables

```powershell
# Verify frontend URL env var
gcloud run services describe powerplay-frontend --region us-central1 `
  --format='value(spec.template.spec.containers[0].env[name=REACT_APP_API_URL])'

# Update if needed
gcloud run services update powerplay-frontend `
  --set-env-vars="REACT_APP_API_URL=https://your-backend-url.run.app/api" `
  --region us-central1
```

### Issue: Services timing out or crashing

**Solution:** Increase memory/CPU allocation

```powershell
# Backend (increase memory)
gcloud run services update powerplay-backend `
  --memory 2Gi `
  --cpu 2 `
  --region us-central1

# Frontend (increase if needed)
gcloud run services update powerplay-frontend `
  --memory 1Gi `
  --region us-central1
```

### Issue: Check service logs for errors

```powershell
# Get detailed error logs
gcloud run logs read powerplay-backend --region us-central1 --limit 200

# Watch in real-time
gcloud run logs read powerplay-backend --region us-central1 --follow
```

---

## Cleanup & Cost Optimization

### View Current Services and Costs

```powershell
# List all resources
gcloud run services list --region us-central1

# Get service details
gcloud run services describe powerplay-backend --region us-central1

# View billing
# Open: https://console.cloud.google.com/billing
```

### Set Auto-Scaling Limits (Optional)

```powershell
# Reduce costs - set lower min instances
gcloud run services update powerplay-backend `
  --min-instances 0 `
  --max-instances 50 `
  --region us-central1

gcloud run services update powerplay-frontend `
  --min-instances 0 `
  --max-instances 20 `
  --region us-central1
```

### Delete Services (if needed)

```powershell
# Delete backend
gcloud run services delete powerplay-backend --region us-central1 --quiet

# Delete frontend
gcloud run services delete powerplay-frontend --region us-central1 --quiet
```

---

## Important Notes

1. **First deployment takes 5-10 minutes** - services need to initialize
2. **Cloud SQL must be running** - verify status in GCP console
3. **Service account needs permissions** - Cloud SQL Client, Storage Editor roles
4. **Database must exist** - video_metadata database created in Cloud SQL
5. **Monitor initial logs** - check for connection errors
6. **Test endpoints immediately** - verify services are responding

---

## Next Steps After Deployment

1. **Configure custom domain** (optional)
   ```powershell
   gcloud run domain-mappings create `
     --service=powerplay-backend `
     --domain=api.yourdomain.com `
     --region=us-central1
   ```

2. **Set up monitoring & alerts**
   - Go to: https://console.cloud.google.com/monitoring
   - Create dashboards for CPU, Memory, Errors

3. **Enable Cloud SQL backups**
   - Go to: https://console.cloud.google.com/sql/instances
   - Enable automated backups

4. **Set budget alerts**
   - Go to: https://console.cloud.google.com/billing
   - Set up cost alerts

---

## Support Resources

- **Google Cloud Run Docs**: https://cloud.google.com/run/docs
- **Cloud SQL Docs**: https://cloud.google.com/sql/docs
- **Cloud Storage Docs**: https://cloud.google.com/storage/docs
- **Deployment Checklist**: See `DEPLOYMENT_CHECKLIST.md` for detailed steps
- **Deployment Scripts**: `deploy.ps1` (Windows) or `deploy.sh` (Linux/Mac)

---

## Deployment Status Checklist

- [x] PostgreSQL drivers installed
- [x] Database configuration updated
- [x] Docker images prepared
- [x] Environment variables ready
- [x] Deployment scripts created
- [ ] GCP SDK installed ← Next step
- [ ] Authenticated with GCP ← Next step
- [ ] Images built and pushed ← Next step
- [ ] Services deployed ← Next step
- [ ] Services verified ← Next step
- [ ] Monitoring configured ← After deployment
- [ ] Backups enabled ← After deployment

---

**Ready to deploy? Run:** `.\deploy.ps1`
