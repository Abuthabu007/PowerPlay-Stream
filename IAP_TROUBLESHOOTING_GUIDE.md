# IAP Configuration & Troubleshooting Guide

## Current Issue

You're getting: `"Unauthorized: Missing Authorization header. Is IAP enabled in Load Balancer?"`

This means **the Authorization header is NOT being sent** from the Load Balancer to Cloud Run.

---

## 🔧 Solution - Two Options

### **Option 1: Enable IAP Properly (Production)**

#### Step 1: Configure Load Balancer with IAP

```
GCP Console → Compute Engine → Load balancing → Select your LB → Edit
```

1. Go to **Backend services**
2. Select your backend (should point to Cloud Run: `powerplay-stream`)
3. Click **Enable Cloud Armor or IAP**
4. Check **Enable IAP**
5. Click **Edit OAuth Settings**

#### Step 2: Create OAuth 2.0 Credentials

```
GCP Console → APIs & Services → OAuth consent screen
```

1. Select **External** user type
2. Fill in:
   - App name: `PowerPlay Stream`
   - User support email: `your-email@gmail.com`
   - Developer contact: `your-email@gmail.com`
3. Click **Save and Continue**

4. Go to **Credentials** tab
5. Click **Create Credentials → OAuth 2.0 Client ID**
6. Select **Web application**
7. Add these Authorized redirect URIs:
   ```
   https://looply.co.in/
   https://looply.co.in/_gcp_gatekeeper/authenticate/gcp
   ```
8. Copy the **Client ID** 

#### Step 3: Configure IAP with OAuth Credentials

Back in Load Balancer settings:
```
Backend services → Edit OAuth Settings
Enter: {YOUR_CLIENT_ID}.apps.googleusercontent.com
```

#### Step 4: Add Users to IAP

```
GCP Console → Security → Identity-Aware Proxy → Select your backend
Click "Add Principal"
Enter: your-email@gmail.com
Role: IAP-Secured Web App User
```

#### Step 5: Deploy Cloud Run with Validation Enabled

```powershell
gcloud run deploy powerplay-stream `
  --image=us-central1-docker.pkg.dev/looply-482917/powerplay-stream/app:latest `
  --region=us-central1 `
  --port=8080 `
  --memory=512Mi `
  --set-env-vars=NODE_ENV=production `
  --set-env-vars=DISABLE_IAP_VALIDATION=false `
  --set-env-vars=GCP_PROJECT_ID=looply-482917 `
  --remove-env-vars=ALLOW_DIRECT_CLOUD_RUN_ACCESS
```

**Result:** All requests through Load Balancer will include Authorization header ✓

---

### **Option 2: Allow Direct Cloud Run Access (Development)**

If you're testing directly via Cloud Run URL (not through Load Balancer), use this:

```powershell
gcloud run deploy powerplay-stream `
  --image=us-central1-docker.pkg.dev/looply-482917/powerplay-stream/app:latest `
  --region=us-central1 `
  --port=8080 `
  --memory=512Mi `
  --set-env-vars=NODE_ENV=development `
  --set-env-vars=DISABLE_IAP_VALIDATION=false `
  --set-env-vars=ALLOW_DIRECT_CLOUD_RUN_ACCESS=true
```

**Result:** Can access Cloud Run directly OR through Load Balancer ✓

---

## 🔍 How to Verify IAP is Configured

### Check 1: Load Balancer Settings

```
GCP Console → Compute Engine → Load balancing → Select LB → Backend services
```

Look for:
- ✓ Backend points to Cloud Run service
- ✓ IAP is **Enabled**
- ✓ OAuth Client ID is set

### Check 2: Check Request Headers

Use browser dev tools (Network tab):

**With IAP Enabled:**
- Request goes to: `https://looply.co.in/api/user-info`
- Contains header: `Authorization: Bearer <JWT-TOKEN>`
- Status: 200 ✓

**Without IAP (direct Cloud Run):**
- Request goes to: `https://powerplay-stream-xxxxx.run.app/api/user-info`
- NO Authorization header
- Status: 401 (if ALLOW_DIRECT_CLOUD_RUN_ACCESS=false)

### Check 3: Cloud Run Environment Variables

```powershell
gcloud run services describe powerplay-stream --region=us-central1 --format='value(spec.template.spec.containers[0].env)'
```

Should show:
- `DISABLE_IAP_VALIDATION=false`
- `GCP_PROJECT_ID=looply-482917`

---

## 📋 Deployment Checklist

For **Production (with IAP)**:

- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Load Balancer backend points to Cloud Run
- [ ] IAP enabled on Load Balancer
- [ ] OAuth Client ID configured in IAP settings
- [ ] Users added to IAP role
- [ ] Cloud Run deployed with `DISABLE_IAP_VALIDATION=false`
- [ ] Custom domain (looply.co.in) points to Load Balancer
- [ ] Test via Load Balancer URL (not direct Cloud Run URL)

For **Development (direct Cloud Run)**:

- [ ] Cloud Run deployed with `ALLOW_DIRECT_CLOUD_RUN_ACCESS=true`
- [ ] Test via direct Cloud Run URL

---

## 🚨 Common Issues & Fixes

### Issue: Still getting "Missing Authorization header"

**Cause:** IAP not enabled OR request going directly to Cloud Run

**Fix:**
```powershell
# Check Load Balancer backend
gcloud compute backend-services list --filter="name:*powerplay*"

# Check Cloud Run URL is NOT being used directly
# Use custom domain through Load Balancer instead
```

### Issue: "Invalid Authorization header format"

**Cause:** Token format is wrong

**Fix:** Check that header is exactly: `Authorization: Bearer <token>`

### Issue: Getting 403 Forbidden after login

**Cause:** User not in IAP role

**Fix:**
```
GCP Console → Security → Identity-Aware Proxy
Select backend → Add Principal → Your email
```

### Issue: OAuth redirect loop

**Cause:** Redirect URI mismatch

**Fix:** 
1. Get exact Load Balancer URL
2. Add to OAuth credentials:
   - `https://your-domain/`
   - `https://your-domain/_gcp_gatekeeper/authenticate/gcp`

---

## 🎯 Quick Test

### Test 1: Local Development

```powershell
# Rebuild image
docker build -t powerplay-stream:latest -f Dockerfile.monolithic .

# Deploy with dev settings
docker run -p 8080:8080 `
  -e DISABLE_IAP_VALIDATION=true `
  -e NODE_ENV=development `
  powerplay-stream:latest

# Test
curl http://localhost:8080/api/user-info
# Should return dev user ✓
```

### Test 2: Cloud Run Direct Access

```powershell
# Deploy with direct access allowed
gcloud run deploy powerplay-stream `
  --set-env-vars=ALLOW_DIRECT_CLOUD_RUN_ACCESS=true

# Get Cloud Run URL
gcloud run services describe powerplay-stream --region=us-central1 --format='value(status.url)'

# Test (using curl or browser)
curl https://powerplay-stream-xxxxx.run.app/api/user-info
# Should return dev user ✓
```

### Test 3: Production with IAP

```powershell
# Deploy with IAP validation
gcloud run deploy powerplay-stream `
  --set-env-vars=DISABLE_IAP_VALIDATION=false `
  --remove-env-vars=ALLOW_DIRECT_CLOUD_RUN_ACCESS

# Visit through Load Balancer URL (with custom domain)
# Should authenticate via Google OAuth ✓
# Then return user info ✓
```

---

## Environment Variables Reference

| Variable | Value | When to Use |
|----------|-------|-------------|
| `DISABLE_IAP_VALIDATION` | `true` | Local development only |
| `DISABLE_IAP_VALIDATION` | `false` | Production with IAP |
| `ALLOW_DIRECT_CLOUD_RUN_ACCESS` | `true` | Testing Cloud Run directly |
| `ALLOW_DIRECT_CLOUD_RUN_ACCESS` | `false` (unset) | Production with Load Balancer |
| `GCP_PROJECT_ID` | `looply-482917` | Always set |
| `NODE_ENV` | `production` or `development` | As needed |

---

## What to Do Now

### **If you want IAP (Recommended for Production):**

1. Follow "Option 1" above
2. Configure Load Balancer + IAP properly
3. Deploy with `DISABLE_IAP_VALIDATION=false`
4. Access via custom domain (through Load Balancer)

### **If you want Direct Cloud Run (For Testing):**

1. Rebuild and deploy with:
   ```powershell
   gcloud run deploy powerplay-stream `
     --set-env-vars=ALLOW_DIRECT_CLOUD_RUN_ACCESS=true
   ```
2. Access directly via Cloud Run URL
3. App will use dev user automatically

---

## Architecture Diagrams

### Production Setup (Recommended)

```
User Browser
    ↓
https://looply.co.in
    ↓
Load Balancer (with IAP enabled)
    ↓ (injects Authorization header)
Cloud Run (powerplay-stream)
    ↓
/api/user-info returns user from JWT ✓
```

### Development Setup (Testing)

```
User Browser / API Client
    ↓
Direct: https://powerplay-stream-xxxxx.run.app
    ↓
Cloud Run (ALLOW_DIRECT_CLOUD_RUN_ACCESS=true)
    ↓
/api/user-info returns dev user ✓
```
