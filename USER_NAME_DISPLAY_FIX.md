# User Name Display Fix - Show Logged-In User

## Problem
After IAP validation and login, the application displayed **"Authenticated User"** instead of the actual logged-in user's real name.

## Root Cause
The LoginPage component was hardcoding "Authenticated User" instead of extracting the actual user's name from:
1. The JWT token payload
2. The backend `/api/user-info` endpoint

The flow was:
1. User logs in
2. LoginPage creates/gets token ✓
3. LoginPage validates with backend ✓
4. **LoginPage hardcodes "Authenticated User"** ❌
5. App.jsx later fetches `/api/user-info` but too late

## Solution
Updated two files to extract and use the real user name:

### 1. Frontend: LoginPage.jsx
**Changes:**
- Extract user info from JWT token payload
- Call `/api/user-info` endpoint with authentication
- Pass real user data to `onLoginSuccess()`
- Fallback chain: Backend data → Token payload → Defaults

**Code flow:**
```javascript
1. Get token (IAP or mock)
2. Extract payload from token
   ↓
3. Call /api/user-info with token
   ↓
4. Use backend response if available
   ↓
5. Fallback to token payload
   ↓
6. Use defaults if needed
   ↓
7. Pass real userData to onLoginSuccess()
```

### 2. Backend: index.js - /api/user-info endpoint
**Changes:**
- Added fallback for base64 token decoding (mock tokens)
- Now handles both JWT and mock token formats
- Extracts name and role from token

**Code improvement:**
```javascript
// Before: Only decoded JWT
const decoded = jwt.decode(iapJwt, { complete: true });

// After: Tries JWT first, falls back to base64
try {
  decoded = jwt.decode(iapJwt, { complete: true });  // Real IAP tokens
  payload = decoded.payload;
} catch (err) {
  // Fallback to base64 for mock tokens
  const decoded = Buffer.from(iapJwt, 'base64').toString('utf-8');
  payload = JSON.parse(decoded);
}
```

## Data Flow

### Before (❌ Shows "Authenticated User")
```
User Login
    ↓
Get Token
    ↓
Validate with /api/health
    ↓
Call onLoginSuccess({name: 'Authenticated User'})  ← HARDCODED
    ↓
Display: "Authenticated User"
    ↓
(Later) App.jsx calls /api/user-info (too late)
```

### After (✅ Shows Real User Name)
```
User Login
    ↓
Get Token (IAP or mock)
    ↓
Extract name from token payload
    ↓
Call /api/user-info with token → Get {name, email, role}
    ↓
Call onLoginSuccess({name: 'John Doe', email: '...', role: '...'})
    ↓
Display: "John Doe"
```

## What Gets Displayed

### Mock Token (Development)
- Token created with: `email: 'test@example.com'`, `name: 'Test User'`
- Displayed as: **Test User**

### Real IAP Token (Production)
- Token from Google includes: `email: 'user@gmail.com'`, `name: 'John Doe'`
- Displayed as: **John Doe**

### Database User (If created)
- User record has: `name: 'Custom Name'`
- Displayed as: **Custom Name**

## Fallback Hierarchy
```
Priority 1: Backend /api/user-info response (most authoritative)
  ├─ name: User's name from database
  ├─ email: User's email
  └─ role: User's role (admin, user, etc.)

Priority 2: JWT/Mock token payload (if backend fails)
  ├─ name: From token creation
  ├─ email: From token creation
  └─ role: From token creation

Priority 3: Defaults (last resort)
  ├─ name: "User"
  ├─ email: "user@example.com"
  └─ role: "user"
```

## Files Modified

### 1. frontend/src/pages/LoginPage.jsx
- Extracts user info from JWT token
- Calls `/api/user-info` endpoint
- Uses fallback chain for user data
- Better logging with `[LOGIN]` prefix
- Passes real user data to `onLoginSuccess()`

### 2. backend/src/index.js
- Updated `/api/user-info` endpoint
- Handles both JWT and base64 tokens
- Falls back to base64 if JWT decode fails
- Returns role from token payload

## Testing

### Local Development
```bash
# Build and run
cd PowerPlay-Stream/frontend && npm run build
cd ../backend && npm start

# Login and check
1. Open http://localhost:5000
2. Click "Sign In"
3. Check header - should show "Test User" (not "Authenticated User")
4. Open DevTools Console
5. Look for: "[LOGIN] User logged in: test@example.com (Test User)"
```

### Verify in Browser Console
```javascript
// After login, check localStorage
const token = localStorage.getItem('iapToken');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('User name:', payload.name);
console.log('User email:', payload.email);
console.log('User role:', payload.role);
```

### Check Backend Logs
```bash
gcloud run logs read looply-monolithic --limit=50 | grep "USER-INFO\|LOGIN"
```

Should show:
```
[LOGIN] Extracted user from token: test@example.com Test User
[LOGIN] Fetching user info from backend...
[USER-INFO] Decoded base64 mock token successfully
[LOGIN] User info from backend: {id: '...', name: 'Test User', email: '...'}
[LOGIN] User logged in: test@example.com (Test User)
```

## Key Improvements

1. ✅ **Real User Names**: Displays actual user name, not hardcoded "Authenticated User"
2. ✅ **Token Extraction**: Extracts name from JWT/mock token immediately
3. ✅ **Backend Verification**: Calls `/api/user-info` for authoritative user data
4. ✅ **Fallback Chain**: Works even if backend fails
5. ✅ **Role Information**: Passes user role to app
6. ✅ **Better Logging**: Detailed logs for debugging
7. ✅ **Backward Compatible**: Works with both mock and real IAP tokens

## Related Features
- User name displayed in header: `👤 {user?.name || 'User'}`
- User role used for authorization checks
- User email stored and used for user identification
- User ID used for database queries

## Deployment

### Build Frontend
```bash
cd PowerPlay-Stream/frontend
npm install
npm run build
```

### Deploy to Cloud Run
```bash
cd PowerPlay-Stream
./build-monolithic.ps1

gcloud run deploy looply-monolithic \
  --image gcr.io/YOUR_PROJECT/looply-monolithic:latest \
  --port 5000 \
  --region us-central1
```

## Verification Checklist

After deployment:
- [ ] Login successful
- [ ] Header shows real user name (not "Authenticated User")
- [ ] User email appears in header/profile
- [ ] Upload and other features work
- [ ] No console errors
- [ ] Backend logs show user name extraction
- [ ] Multiple users show different names
- [ ] Logout and re-login shows correct name

## Troubleshooting

### Still Showing "Authenticated User"?
1. Clear browser cache: `Ctrl+Shift+Delete`
2. Clear localStorage: `localStorage.clear()`
3. Re-login
4. Check DevTools Console for `[LOGIN]` messages
5. Check backend logs for `[USER-INFO]` messages

### Name Shows as "User" or "Unknown"?
1. Check token payload: `JSON.parse(atob(token.split('.')[1]))`
2. Verify `name` field exists in token
3. Check `/api/user-info` response in Network tab
4. Look for decode errors in backend logs

### Different Name on Refresh?
1. Check `checkAuthentication()` in App.jsx
2. Verify `/api/user-info` endpoint is called
3. Check that token is still valid in localStorage
4. Monitor backend logs for auth issues

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Frontend App                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│ HomePage displays user name from state         │
│ └─ user.name = "John Doe"                      │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↑
                      │
              setUser() from LoginPage
                      │
┌─────────────────────────────────────────────────┐
│ LoginPage.jsx                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ 1. Get token (IAP or mock)                      │
│ 2. Extract payload.name from token              │
│ 3. Call /api/user-info with token              │
│ 4. Use backend response or fallback             │
│ 5. Call onLoginSuccess(userData)                │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↑
                      │
              Fetch with Authorization header
                      │
┌─────────────────────────────────────────────────┐
│ Backend: /api/user-info                         │
├─────────────────────────────────────────────────┤
│                                                 │
│ 1. Extract token from Authorization header      │
│ 2. Decode (JWT or base64)                       │
│ 3. Return { id, name, email, role }             │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↑
                      │
                    Token payload
                      │
                  JWT or Base64
```

## Summary
The fix ensures that users see their actual logged-in name immediately after authentication, by extracting user information from the JWT token and fetching additional data from the backend's `/api/user-info` endpoint.
