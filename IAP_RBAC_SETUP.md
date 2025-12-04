# IAP Setup with Role-Based User Management

## User Configuration

The system has 3 authorized users with specific roles:

| Email | Role | Permissions |
|-------|------|-------------|
| `ahamedbeema1989@gmail.com` | Superadmin | Full system access, manage all users, assign roles |
| `muskansharma2598@gmail.com` | Admin | Manage regular users, view user list |
| `amrithachand@gmail.com` | User | Standard user access, upload/manage own videos |

## Architecture

- **superadmin**: Can manage all users, assign roles, view all content
- **admin**: Can manage users and view user list, manage standard users
- **user**: Standard user with video upload/management capabilities

## User Management API Endpoints

All endpoints require IAP authentication and authorization.

### Get All Users (Admin/Superadmin only)
```
GET /api/users
Headers: Authorization: Bearer <IAP_JWT>
Response: { success: true, data: [...users] }
```

### Get Current User Info
```
GET /api/users/me/info
Response: { success: true, data: { id, email, name, role } }
```

### Update User Role (Superadmin only)
```
PATCH /api/users/{userId}/role
Body: { "role": "admin" | "user" | "superadmin" }
Response: { success: true, message: "...", data: {...user} }
```

### Deactivate User (Admin/Superadmin)
```
PATCH /api/users/{userId}/deactivate
Response: { success: true, message: "...", data: {...user} }
```

### Reactivate User (Admin/Superadmin)
```
PATCH /api/users/{userId}/reactivate
Response: { success: true, message: "...", data: {...user} }
```

## GCP IAP Configuration Steps

### Step 1: Enable IAP API

1. Go to [GCP Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Library**
3. Search for "Identity-Aware Proxy"
4. Click **Enable**

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - **App name**: PowerPlay Stream
   - **User support email**: ahamedbeema1989@gmail.com
   - **Developer contact**: ahamedbeema1989@gmail.com
4. Click **Save and Continue**
5. Add scopes:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Click **Save and Continue** to finish

### Step 3: Create OAuth 2.0 Client ID

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Select **Web application**
4. Configure:
   - **Name**: PowerPlay Stream IAP
   - **Authorized JavaScript origins**: `https://YOUR_CLOUD_RUN_URL`
   - **Authorized redirect URIs**:
     - `https://YOUR_CLOUD_RUN_URL/_gcp_gatekeeper/authenticate/gcp`
     - `https://YOUR_CLOUD_RUN_URL/`
5. Click **Create**
6. **Copy the Client ID** (you'll need it in the next step)

### Step 4: Enable IAP and Set OAuth Credentials

1. Go to **Security > Identity-Aware Proxy**
2. Find your Cloud Run service `powerplay-stream`
3. Click the toggle to **Enable IAP**
4. Once enabled, click the service to open the side panel
5. Click **Edit OAuth Consent Screen**
6. Paste your **OAuth 2.0 Client ID** from Step 3
7. Click **Update**

### Step 5: Add Authorized Users to IAP

1. In the IAP console, check the checkbox next to your service
2. Click **Add Principal** on the right panel
3. Enter the email address: `ahamedbeema1989@gmail.com`
4. Assign role: **IAP-Secured Web App User**
5. Click **Save**
6. Repeat for:
   - `muskansharma2598@gmail.com`
   - `amrithachand@gmail.com`

### Step 6: Deploy with IAP Enabled

```powershell
# Build image
docker build -f Dockerfile.monolithic -t powerplay-stream:latest .

# Tag for Artifact Registry
docker tag powerplay-stream:latest us-central1-docker.pkg.dev/YOUR_PROJECT_ID/powerplay-stream/powerplay-stream:latest

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/powerplay-stream/powerplay-stream:latest

# Get Cloud Run service URL
$CLOUD_RUN_URL = gcloud run services describe powerplay-stream --region=us-central1 --format='value(status.url)'

# Deploy with IAP
gcloud run deploy powerplay-stream `
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/powerplay-stream/powerplay-stream:latest `
  --region=us-central1 `
  --set-env-vars=DISABLE_IAP_VALIDATION=false `
  --set-env-vars=GCP_PROJECT_ID=YOUR_PROJECT_ID `
  --memory=2Gi `
  --timeout=3600s
```

### Step 7: Update Dockerfile IAP Configuration

The Dockerfile is already set to:
```dockerfile
ENV DISABLE_IAP_VALIDATION=false
```

This ensures IAP validation is enabled in production.

## Testing IAP

### Test Authorization Header
1. Sign in with one of the authorized emails
2. Access your Cloud Run URL
3. Check Cloud Run logs to verify the Authorization header is present:
   ```
   [AUTH] Authorization header: Present
   ```

### Test User Management
1. Sign in as `ahamedbeema1989@gmail.com` (superadmin)
2. Call `/api/users` to see all users
3. Try to update a user's role with `/api/users/{userId}/role`

## Troubleshooting

### "Unauthorized: Missing Authorization header"
- IAP is not configured in GCP Console
- OAuth credentials not set in IAP settings
- User not added to IAP access list

**Fix**: Complete Steps 4-5 above

### "User not authorized to access this application"
- User email is not in the allowed list
- Email doesn't match any of the 3 authorized users

**Fix**: 
- Add user email to `backend/src/config/users.js`
- Redeploy backend

### "Invalid token format" or JWT errors
- IAP audience not correctly configured
- Cloud Run URL changed

**Fix**: Verify IAP_AUDIENCE environment variable is set correctly

## Home Page User Management UI

Once IAP is configured, your frontend should:

1. Call `/api/users/me/info` to get current user info
2. If `role === 'superadmin'`, show user management panel
3. Show list of users from `/api/users`
4. Allow role updates for superadmin users

Frontend example:
```javascript
// Check if current user is superadmin
const response = await fetch('/api/users/me/info');
const { data: user } = await response.json();

if (user.role === 'superadmin') {
  // Show user management UI
  showUserManagementPanel();
}

// Get all users
const usersResponse = await fetch('/api/users');
const { data: users } = await usersResponse.json();
```

## Security Notes

- **IAP is your first line of defense**: Blocks all unauthenticated traffic
- **Backend JWT verification adds defense-in-depth**: Validates tokens are legitimate
- **Role-based access control**: Ensures users can only perform authorized actions
- **Email-based authorization**: Makes management simple and scalable
- **Database sync**: User roles stay in sync with email configuration

## Adding More Users

To add new users:

1. Add email to `backend/src/config/users.js`:
   ```javascript
   const USER_ROLES = {
     superadmin: ['ahamedbeema1989@gmail.com'],
     admin: ['muskansharma2598@gmail.com', 'newadmin@example.com'],
     user: ['amrithachand@gmail.com']
   };
   ```

2. Add them to IAP in GCP Console (Security > Identity-Aware Proxy)

3. Redeploy backend:
   ```powershell
   docker build -f Dockerfile.monolithic -t powerplay-stream:latest .
   docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/powerplay-stream/powerplay-stream:latest
   gcloud run deploy powerplay-stream --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/powerplay-stream/powerplay-stream:latest ...
   ```
