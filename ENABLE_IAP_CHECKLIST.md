# IAP Enablement Checklist

## Code Changes ✅
- [x] Search routes updated with IAP authentication
- [x] User info endpoints created (`/api/user-info`, `/api/users/me/info`)
- [x] Backend middleware properly configured for IAP validation
- [x] Health check endpoint remains public for monitoring

## Pre-Deployment Steps

### Step 1: Verify GCP Configuration

```powershell
# Set your project ID
$env:GCP_PROJECT_ID = "your-project-id"

# Get your project number (needed for IAP_AUDIENCE)
$projectNumber = gcloud projects describe $env:GCP_PROJECT_ID --format='value(projectNumber)'
Write-Host "Project Number: $projectNumber"

# Verify IAP API is enabled
gcloud services list --enabled --filter="name:iap" --project=$env:GCP_PROJECT_ID
```

### Step 2: Get Backend Service ID (for Cloud Run)

If using Cloud Run:
```powershell
# List Cloud Run services
gcloud run services list --region=us-central1 --project=$env:GCP_PROJECT_ID

# Get the backend service ID from IAP console
# Navigate to: Security > Identity-Aware Proxy > Cloud Run > Select your service
```

### Step 3: Find Service URL

```powershell
# Get Cloud Run service URL
$serviceUrl = gcloud run services describe powerplay-stream `
  --region=us-central1 `
  --project=$env:GCP_PROJECT_ID `
  --format='value(status.url)'

Write-Host "Service URL: $serviceUrl"
```

## Deployment Steps

### Step 1: Build and Push Docker Image

```powershell
# Set variables
$PROJECT_ID = "your-project-id"
$REGION = "us-central1"
$SERVICE_NAME = "powerplay-stream"
$IMAGE_NAME = "$REGION-docker.pkg.dev/$PROJECT_ID/$SERVICE_NAME/$SERVICE_NAME"

# Build image
docker build -f Dockerfile.monolithic -t $SERVICE_NAME:latest .

# Tag for Artifact Registry
docker tag $SERVICE_NAME:latest $IMAGE_NAME:latest

# Push to Artifact Registry
docker push $IMAGE_NAME:latest
```

### Step 2: Get IAP Audience Value

The IAP_AUDIENCE format for Cloud Run is:
```
/projects/{PROJECT_NUMBER}/global/backendServices/{BACKEND_SERVICE_ID}
```

For Cloud Run, you can get this from:
1. GCP Console > Security > Identity-Aware Proxy
2. Click on your Cloud Run service
3. Look for the "Audience" field in the service details

Or use this command:
```powershell
# Alternative: For Cloud Run, the audience can be the service URL
$serviceUrl = gcloud run services describe $SERVICE_NAME `
  --region=$REGION `
  --project=$PROJECT_ID `
  --format='value(status.url)'

# The audience for Cloud Run is typically the URL
$iapAudience = $serviceUrl.Replace("https://", "").Replace("/", "")
```

### Step 3: Deploy to Cloud Run with IAP

```powershell
$env:GCP_PROJECT_ID = "your-project-id"
$env:PROJECT_NUMBER = "your-project-number"
$env:BACKEND_SERVICE_ID = "your-backend-service-id"  # Get from GCP Console
$env:SERVICE_NAME = "powerplay-stream"
$env:REGION = "us-central1"

# The IAP_AUDIENCE value - format depends on your infrastructure:
# For Cloud Run with IAP on Compute Engine Load Balancer:
$env:IAP_AUDIENCE = "/projects/$($env:PROJECT_NUMBER)/global/backendServices/$($env:BACKEND_SERVICE_ID)"

# Deploy
gcloud run deploy $env:SERVICE_NAME `
  --image="$REGION-docker.pkg.dev/$($env:GCP_PROJECT_ID)/$($env:SERVICE_NAME)/$($env:SERVICE_NAME):latest" `
  --region=$REGION `
  --platform=managed `
  --allow-unauthenticated=false `
  --set-env-vars="DISABLE_IAP_VALIDATION=false" `
  --set-env-vars="GCP_PROJECT_ID=$($env:GCP_PROJECT_ID)" `
  --set-env-vars="IAP_AUDIENCE=$($env:IAP_AUDIENCE)" `
  --memory=2Gi `
  --timeout=3600s `
  --project=$env:GCP_PROJECT_ID
```

## Post-Deployment Verification

### Test IAP Protection

```powershell
# Get service URL
$serviceUrl = gcloud run services describe powerplay-stream `
  --region=us-central1 `
  --project=$env:GCP_PROJECT_ID `
  --format='value(status.url)'

# Test health endpoint (should be public)
curl -k "$serviceUrl/health"

# Test protected endpoint (should require IAP token/authentication)
curl -k "$serviceUrl/api/user-info"
# Should return 401 Unauthorized without valid IAP JWT
```

### Test User Authentication

1. Use a browser and navigate to: `$serviceUrl`
2. Should be redirected to Google login (if IAP is properly configured)
3. After login with authorized email, should access the service
4. Check browser console for JWT token in Authorization header

### Check Backend Logs

```powershell
gcloud run logs read $SERVICE_NAME `
  --region=us-central1 `
  --project=$env:GCP_PROJECT_ID `
  --limit=50
```

## Troubleshooting

### Issue: "IAP validation is disabled" warning

**Solution**: Ensure `DISABLE_IAP_VALIDATION=false` is set in Cloud Run environment variables

### Issue: JWT verification fails

**Possible causes**:
1. IAP_AUDIENCE not correctly configured
2. IAP JWT token expired
3. Google public keys cache issue (should auto-retry)

**Solution**:
- Verify IAP_AUDIENCE value in Cloud Run environment
- Check that IAP is enabled on the Cloud Run service in GCP Console
- Review backend logs for detailed error messages

### Issue: 403 Forbidden for authorized users

**Possible causes**:
1. User email not in `USER_ROLES` configuration in `backend/src/config/users.js`
2. User not granted IAP role in GCP Console

**Solution**:
- Add user email to appropriate role in `backend/src/config/users.js`
- In GCP Console > Security > Identity-Aware Proxy, grant user the "IAP-Secured Web App User" role

## Configuration Files Reference

### User Roles Configuration
File: `backend/src/config/users.js`

```javascript
const USER_ROLES = {
  superadmin: [
    'ahamedbeema1989@gmail.com'
  ],
  admin: [
    'muskansharma2598@gmail.com'
  ],
  user: [
    'amrithachand@gmail.com'
  ]
};
```

Modify this file to add/update authorized users.

### Authentication Middleware
File: `backend/src/middleware/auth.js`

- Verifies IAP JWT tokens
- Validates user emails against allowed list
- Assigns roles based on configuration
- Supports fallback verification for development

### Docker Configuration
File: `Dockerfile.monolithic`

- Sets `DISABLE_IAP_VALIDATION=false` for production
- Combines frontend and backend in single image
- Configured for Cloud Run deployment

## Environment Variables Summary

| Variable | Value | Purpose |
|----------|-------|---------|
| `DISABLE_IAP_VALIDATION` | `false` | Enable IAP token verification |
| `GCP_PROJECT_ID` | Your project ID | For IAP configuration |
| `IAP_AUDIENCE` | `/projects/{number}/global/backendServices/{id}` | JWT audience validation |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `8080` | HTTP server port |
| `FRONTEND_URL` | Your frontend URL | CORS configuration |

## Next Steps

1. ✅ Code changes completed
2. ⏳ Build and push Docker image
3. ⏳ Deploy to Cloud Run with environment variables
4. ⏳ Verify IAP is enabled in GCP Console
5. ⏳ Test protected endpoints
6. ⏳ Monitor logs for authentication issues
