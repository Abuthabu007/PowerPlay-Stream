# JWT Token Fix - Action Guide

## What Was Fixed
The "Unauthorized: Invalid JWT" error when uploading videos was caused by:
- **Frontend** creating invalid token format (base64 string instead of JWT)
- **Backend** unable to parse the invalid token format

## Changes Made

### Frontend: `src/pages/LoginPage.jsx`
✅ Now creates proper JWT format: `header.payload.signature`
✅ Uses base64-encoded JSON for each part
✅ Includes `alg`, `typ`, `iat`, `exp` fields
✅ Better logging with `[LOGIN]` prefix

### Backend: `src/middleware/auth.js`
✅ Tries JWT decode first (for real IAP tokens)
✅ Falls back to base64 parsing (for development)
✅ Better error messages and logging
✅ Maintains backward compatibility

## Deployment Steps

### 1. Build Frontend
```bash
cd PowerPlay-Stream/frontend
npm install
npm run build
```

### 2. Test Locally
```bash
# In one terminal (backend)
cd PowerPlay-Stream/backend
npm start

# Application runs at http://localhost:5000
```

### 3. Deploy to Production
```bash
# Build monolithic image
cd PowerPlay-Stream
./build-monolithic.ps1

# Deploy to Cloud Run
gcloud run deploy looply-monolithic \
  --image gcr.io/YOUR_PROJECT/looply-monolithic:latest \
  --port 5000 \
  --region us-central1
```

## Verification

### Check Token Format (Browser Console)
```javascript
// After login, check token in localStorage
const token = localStorage.getItem('iapToken');
console.log(token); // Should look like: "eyJ... . eyJ... . signature"

// Count dots - should be 2
token.split('.').length  // Should return 3
```

### Check Backend Logs
```bash
gcloud run logs read looply-monolithic --limit=50 | grep AUTH
# Should show: "[AUTH] Decoded JWT successfully"
```

### Test Upload
1. Open http://looply.co.in (or your deployment URL)
2. Click "Sign In"
3. Check browser console:
   - Should see `[LOGIN] Using mock JWT token` (or IAP token if real)
4. Click "Upload Video"
5. Select a video file
6. Enter title and click "Upload"
7. Should see `[UPLOAD] Upload successful` in console
8. No 401 errors ✅

## Troubleshooting

### If Still Getting 401 Error:
1. **Clear localStorage**:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

2. **Check token format**:
   - Open DevTools Console
   - Paste: `localStorage.getItem('iapToken')`
   - Should have 2 dots (3 parts)

3. **Check backend logs**:
   ```bash
   gcloud run logs read looply-monolithic --limit=100
   ```
   - Look for `[AUTH]` messages
   - Check for specific error: "Decoded JWT successfully" or "Decoded base64 mock token"

4. **Verify email authorization**:
   - Check `backend/src/config/users.js`
   - Ensure your test email is in the authorized list

### Debug Mode:
Set `DISABLE_IAP_VALIDATION=true` on Cloud Run to bypass JWT checks (dev only):
```bash
gcloud run deploy looply-monolithic \
  --set-env-vars DISABLE_IAP_VALIDATION=true
```

## Files Changed
- ✅ `frontend/src/pages/LoginPage.jsx` - Token creation
- ✅ `backend/src/middleware/auth.js` - Token validation

## What Stays the Same
- Upload API logic (no changes)
- File handling (no changes)
- Storage operations (no changes)
- Security checks (no changes)
- Authorization checks (no changes)

## Next Steps
1. Rebuild frontend and backend
2. Deploy to Cloud Run
3. Test login and upload flow
4. Monitor logs for any errors
5. If working, update documentation

## Support
For detailed information, see:
- [JWT_FIX_DOCUMENTATION.md](JWT_FIX_DOCUMENTATION.md) - Technical details
- [UPLOAD_FIX_SUMMARY.md](UPLOAD_FIX_SUMMARY.md) - Previous upload fix
- [IAP_DEPLOYMENT_GUIDE.md](IAP_DEPLOYMENT_GUIDE.md) - IAP setup
