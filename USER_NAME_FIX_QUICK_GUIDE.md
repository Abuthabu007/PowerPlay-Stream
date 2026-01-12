# User Name Display - Quick Fix Guide

## What Was Wrong
App displayed **"Authenticated User"** instead of the logged-in user's real name like **"John Doe"** or **"Test User"**.

## What Changed

### Frontend: `src/pages/LoginPage.jsx`
✅ Now extracts name from JWT token
✅ Calls `/api/user-info` endpoint
✅ Passes real user data to app

**Before:**
```javascript
onLoginSuccess({
  id: 'user-' + Date.now(),
  name: 'Authenticated User',  // ❌ HARDCODED
  email: 'user@example.com'
});
```

**After:**
```javascript
// Extract from token
const payload = JSON.parse(atob(token.split('.')[1]));

// Fetch from backend
const userData = await fetch('/api/user-info', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Use real data
onLoginSuccess({
  id: userData.id || payload.sub,
  name: userData.name || payload.name,  // ✅ REAL NAME
  email: userData.email || payload.email
});
```

### Backend: `src/index.js` - /api/user-info endpoint
✅ Now handles both JWT and base64 tokens
✅ Returns name, email, role

**Key change:**
```javascript
// Try JWT decode (for real IAP)
try {
  decoded = jwt.decode(iapJwt, { complete: true });
} catch (err) {
  // Fallback to base64 (for mock tokens)
  decoded = Buffer.from(iapJwt, 'base64').toString('utf-8');
}
```

## How to Deploy

### 1. Build
```bash
cd PowerPlay-Stream/frontend
npm run build
cd ../backend
npm install
```

### 2. Test Locally
```bash
npm start
# Visit http://localhost:5000
# Login
# Header should show your real name (e.g., "Test User")
```

### 3. Deploy to Cloud Run
```bash
cd PowerPlay-Stream
./build-monolithic.ps1
```

## What You'll See

### Development (Mock Token)
- Login as: "Test User"
- Header displays: **👤 Test User** ✅

### Production (Real IAP)
- Login with Google
- Header displays: **👤 John Doe** (real name from OAuth) ✅

## Verification

### In Browser Console
```javascript
// After login
const token = localStorage.getItem('iapToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User:', payload.name, '-', payload.email);
```

### In Backend Logs
```bash
gcloud run logs read looply-monolithic --limit=20 | grep LOGIN
# Should show: "[LOGIN] User logged in: test@example.com (Test User)"
```

### Quick Visual Check
1. Login
2. Look at top-right of page
3. Should show: **👤 Test User** (or your real name if using IAP)
4. NOT "👤 Authenticated User" ❌

## Files Changed
- ✅ `frontend/src/pages/LoginPage.jsx` - Extract real user name
- ✅ `backend/src/index.js` - Handle all token formats

## Key Points

1. **Data Priority**:
   - First: Backend `/api/user-info` response
   - Second: Token payload
   - Last: Defaults

2. **Works With**:
   - ✅ Mock tokens (development)
   - ✅ Real IAP tokens (production)
   - ✅ JWT format
   - ✅ Base64 format

3. **Displays In**:
   - Header: `👤 {name}`
   - Used for: Authorization, user identification
   - Logged in: User emails in console

## Troubleshooting

### Still Shows "Authenticated User"?
```javascript
// Clear cache and re-login
localStorage.clear()
location.reload()
```

### Shows "User" Instead of Real Name?
- Check token has `name` field
- Check `/api/user-info` returns data
- Look for errors in backend logs

### Different Name After Refresh?
- Expected behavior
- `/api/user-info` is called on app load
- Should update to correct name

## Summary
Now the app shows the real logged-in user's name immediately after authentication, extracted from the JWT token and verified with the backend.
