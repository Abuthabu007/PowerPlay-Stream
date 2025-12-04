# IAP (Identity-Aware Proxy) Deployment Guide

## Overview
This guide explains how to enable Google Cloud Identity-Aware Proxy (IAP) for your PowerPlay Stream application on Cloud Run.

## Prerequisites
- Cloud Run service already deployed
- GCP project with billing enabled
- Owner or Editor role in GCP

## Step 1: Enable IAP on Cloud Run

1. Go to [GCP Console](https://console.cloud.google.com)
2. Navigate to **Security > Identity-Aware Proxy**
3. Click **Enable API** if not already enabled
4. Select **Cloud Run** from the resource list
5. Find your service (`powerplay-stream`)
6. Click the service to configure

## Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **External** user type
3. Fill in the required fields:
   - **App name**: PowerPlay Stream
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Click **Save and Continue**
5. Add these scopes (on Scopes page):
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Continue to Summary and save

## Step 3: Create OAuth 2.0 Credential

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Select **Web application**
4. Configure:
   - **Name**: PowerPlay Stream IAP
   - **Authorized redirect URIs**: 
     - `https://YOUR_CLOUD_RUN_URL/_gcp_gatekeeper/authenticate/gcp`
     - `https://YOUR_CLOUD_RUN_URL/`
5. Copy the **Client ID** (you'll need it)
6. Click **Create**

## Step 4: Configure IAP OAuth Consent

1. In IAP, select your Cloud Run service
2. Click **Add Principal**
3. Enter service account email (or OAuth client ID)
4. Assign role: **IAP-Secured Web App User**
5. Click **Save**

## Step 5: Enable IAP on Cloud Run Service

1. In IAP Console, check the checkbox next to your service
2. Click **Edit OAuth Consent Screen**
3. Enter your **OAuth 2.0 Client ID** from Step 3
4. Click **Update**

## Step 6: Deploy with IAP Enabled

Update your deployment to set `DISABLE_IAP_VALIDATION=false`:

```powershell
# Rebuild Docker image
docker build -f Dockerfile.monolithic -t powerplay-stream:latest .

# Tag for Cloud Registry
docker tag powerplay-stream:latest us-central1-docker.pkg.dev/YOUR_PROJECT_ID/powerplay-stream/powerplay-stream:latest

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/powerplay-stream/powerplay-stream:latest

# Deploy with IAP validation enabled
$env:GCP_PROJECT_ID = "YOUR_PROJECT_ID"
$env:IAP_SERVICE_NAME = "powerplay-stream"

gcloud run deploy powerplay-stream `
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/powerplay-stream/powerplay-stream:latest `
  --region=us-central1 `
  --set-env-vars=DISABLE_IAP_VALIDATION=false `
  --set-env-vars=GCP_PROJECT_ID=$env:GCP_PROJECT_ID `
  --set-env-vars=IAP_AUDIENCE=/projects/PROJECT_NUMBER/global/backendServices/BACKEND_SERVICE_ID `
  --memory=2Gi `
  --timeout=3600s
```

## Step 7: Get IAP Audience Value

To find the correct IAP audience value:

```powershell
# Get your project number
$projectNumber = gcloud projects describe $env:GCP_PROJECT_ID --format='value(projectNumber)'

# Get backend service ID
$backendServiceId = gcloud compute backend-services list --format='value(id)' --filter='name:gke-ingress-1' | Select-Object -First 1

# The audience will be:
# /projects/{projectNumber}/global/backendServices/{backendServiceId}
```

Or simply set:
```powershell
--set-env-vars=IAP_AUDIENCE=your-client-id.apps.googleusercontent.com
```

## Step 8: Test IAP Authentication

Once deployed, your Cloud Run service will only be accessible to authenticated users.

To access it:
1. Visit your Cloud Run URL
2. You'll be redirected to Google login
3. Sign in with your Google account
4. IAP will validate your identity and add an Authorization header
5. Your backend will verify the JWT token

## Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `DISABLE_IAP_VALIDATION` | `false` | Yes (for IAP) |
| `GCP_PROJECT_ID` | Your GCP project ID | Yes |
| `IAP_AUDIENCE` | IAP audience value | Yes |

## Troubleshooting

### "Unauthorized: Invalid Authorization header format"
- Make sure IAP is properly configured in GCP console
- Verify the OAuth 2.0 credential is set in IAP settings

### "Invalid token format"
- Check that the Authorization header is being sent as `Bearer <token>`
- Ensure IAP is adding the header (check Cloud Run logs)

### JWT Verification Failures
- Verify your `IAP_AUDIENCE` environment variable matches GCP configuration
- Check that Google public keys can be fetched (network/firewall issues)

### User Not Created in Database
- Check database logs for errors in User.findOrCreate()
- Verify Sequelize models are synced

## Local Development (IAP Disabled)

To test locally with IAP disabled:

```powershell
$env:DISABLE_IAP_VALIDATION = "true"
npm start
```

This mocks a dev user so you can test without real IAP tokens.

## Security Notes

⚠️ **IMPORTANT**: 
- Never set `DISABLE_IAP_VALIDATION=true` in production
- IAP should be your primary authentication layer
- Backend JWT verification adds defense-in-depth security
- Always use HTTPS with IAP (Cloud Run provides this automatically)

## References

- [Google Cloud IAP Documentation](https://cloud.google.com/iap/docs)
- [Cloud Run with IAP](https://cloud.google.com/iap/docs/concepts-overview)
- [JWT Verification Guide](https://cloud.google.com/iap/docs/signed-headers-howto)
