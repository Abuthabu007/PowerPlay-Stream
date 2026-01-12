# Troubleshooting Guide - JWT and Upload Errors

## Common Errors and Solutions

### Error: "Unauthorized: Invalid JWT" (401)

#### Check 1: Token Format
**Problem**: Token doesn't have proper JWT structure
```javascript
// WRONG - Only 2 parts
token = "base64string"

// WRONG - Single base64 string
token = btoa(JSON.stringify({...}))

// CORRECT - Three parts with dots
token = "eyJ..." . "eyJ..." . "signature"
```

**Solution**:
1. Open DevTools Console (F12)
2. Check token format:
   ```javascript
   const token = localStorage.getItem('iapToken');
   console.log(token.split('.').length);  // Should print: 3
   ```
3. If not 3 parts, clear and re-login:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

#### Check 2: Token Not Stored
**Problem**: Token missing from localStorage

**Solution**:
1. Open DevTools → Application tab
2. Check localStorage for key: `iapToken`
3. If missing:
   - Click "Sign In" again
   - Check console for `[LOGIN]` messages
   - Verify backend returned 200 on /api/health check

#### Check 3: Backend Not Decoding Token
**Problem**: Backend can't parse token

**Solution**:
1. Check backend logs:
   ```bash
   gcloud run logs read looply-monolithic --limit=50 | grep AUTH
   ```
2. Look for these messages:
   - `[AUTH] Decoded JWT successfully` ✅
   - `[AUTH] Decoded base64 mock token successfully` ✅
   - `[AUTH] Failed to decode token` ❌
3. If seeing error, token format is wrong → go back to Check 1

### Error: "Unauthorized: Invalid Authorization header format" (401)

#### Problem: Token not sent with request

**Solution**:
1. Check Network tab:
   - Open DevTools → Network tab
   - Click "Upload" → find upload POST request
   - Check Headers section
   - Look for: `Authorization: Bearer eyJ...`
2. If missing:
   - Check UploadDialog.jsx is using `videoAPI.uploadVideo()`
   - Verify token is in localStorage
   - Check axios interceptor is applied

### Error: "Unauthorized: {email} is not authorized" (403)

#### Problem: User email not in allowed list

**Solution**:
1. Check your email:
   ```javascript
   // In browser console, after login
   const token = localStorage.getItem('iapToken');
   const parts = token.split('.');
   const payload = JSON.parse(atob(parts[1]));
   console.log(payload.email);
   ```

2. Add email to authorized list:
   - Open `backend/src/config/users.js`
   - Find the `ALLOWED_USERS` or similar configuration
   - Add your email with appropriate role
   - Redeploy backend

3. Verify after redeploy:
   - Clear browser cache: Ctrl+Shift+Delete
   - Logout and login again
   - Try uploading

### Error: "Request failed with status code 401" in console

#### Step 1: Check Browser Console
```
[UPLOAD] Submitting form data...
[UPLOAD] Title: My Video
...
Error: Request failed with status code 401
```

**Solution**:
1. Token exists but backend rejected it
2. Check backend logs (see "Check 3" above)
3. Most likely: Email not authorized

#### Step 2: Check Network Response
1. DevTools → Network tab
2. Find upload request
3. Click → Response tab
4. Should show error JSON:
   ```json
   {
     "success": false,
     "message": "Unauthorized: Invalid JWT"
   }
   ```

5. Read the exact message to identify issue

### Error: "CORS error" in console

#### Problem: Cross-origin request blocked

**Solution**:
1. Check that origin is in CORS whitelist:
   - Backend file: `src/index.js`
   - Should include your domain
2. If running locally:
   - Should be `http://localhost:3000` or similar
3. If deployed:
   - Should be `https://looply.co.in` etc.
4. Add your origin if missing:
   ```javascript
   const allowedOrigins = [
     'http://localhost:3000',
     'https://looply.co.in',
     'https://your-domain.com'  // ADD HERE
   ];
   ```

### Error: Upload starts but never completes

#### Problem: File too large or network issue

**Solution**:
1. Check file size:
   - Maximum: 500MB
   - Check your video file size
   - If larger, split into smaller videos

2. Check network:
   - Open DevTools → Network tab
   - Start upload
   - Watch the request:
     - Should show progress
     - Should eventually complete
   - If stuck:
     - Connection issue
     - Try from different network
     - Check backend logs for errors

3. Check backend logs:
   ```bash
   gcloud run logs read looply-monolithic --limit=100
   ```
   - Look for `[UPLOAD]` messages
   - Check for errors during processing

### Error: Upload succeeds but video doesn't appear

#### Problem: Upload worked but video not saved

**Solution**:
1. Check backend logs:
   ```bash
   gcloud run logs read looply-monolithic --limit=100
   ```
   - Look for `[UPLOAD] Success`
   - Check for database errors
   - Check for storage errors

2. Verify Cloud Storage has the video:
   - Google Cloud Console → Cloud Storage
   - Look for your bucket
   - Check for uploaded file

3. Verify Firestore has the metadata:
   - Google Cloud Console → Firestore
   - Check "videos" collection
   - Should have entry with your video

4. If data missing:
   - Check service account permissions
   - Check environment variables on Cloud Run
   - Check database credentials

## Debug Checklist

When troubleshooting, go through this checklist:

- [ ] **Token exists**: `localStorage.getItem('iapToken')` not null
- [ ] **Token format**: `token.split('.').length === 3`
- [ ] **Token decodable**: Can decode payload: `JSON.parse(atob(parts[1]))`
- [ ] **Authorization header**: Network tab shows `Authorization: Bearer eyJ...`
- [ ] **Backend receives request**: Logs show `[AUTH]` messages
- [ ] **Token decoded successfully**: Logs show `Decoded JWT successfully`
- [ ] **Email authorized**: Check `backend/src/config/users.js`
- [ ] **User created in DB**: Check Firestore
- [ ] **Upload returns 200**: Network tab shows success
- [ ] **File in Cloud Storage**: Check bucket
- [ ] **Metadata in Firestore**: Check database
- [ ] **Video appears in UI**: Check "My Videos" section

## Debug Commands

### Check Token in Console
```javascript
// Get token
const token = localStorage.getItem('iapToken');

// Decode to see payload
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log(payload);

// Expected output:
// {
//   sub: "mock-user-...",
//   name: "Test User",
//   email: "test@example.com",
//   role: "user",
//   iat: 1705000000,
//   exp: 1705003600
// }
```

### Check Backend Authorization
```bash
# View recent auth logs
gcloud run logs read looply-monolithic --limit=50 | grep -E "\[AUTH\]|\[UPLOAD\]"

# View all logs for debugging
gcloud run logs read looply-monolithic --limit=100
```

### Check Databases
```bash
# Check Cloud Storage
gsutil ls gs://your-bucket/videos/

# Check Firestore
gcloud firestore documents list --collection-id=videos

# Check user collection
gcloud firestore documents list --collection-id=users
```

## Getting Help

If stuck, collect this information:

1. **Browser Console Output** (F12 → Console)
   - Screenshot or copy all `[LOGIN]` and `[UPLOAD]` messages
   - Exact error message

2. **Network Tab Output** (F12 → Network)
   - Status code of upload request
   - Response body (error message)
   - Authorization header value

3. **Backend Logs** (gcloud run logs)
   - All `[AUTH]` messages
   - All `[UPLOAD]` messages
   - Any error messages

4. **Token Information**
   - Token format (how many dots?)
   - Email in token
   - Role in token

5. **Environment**
   - Browser (Chrome, Firefox, etc.)
   - Is this local dev or Cloud Run?
   - What's your domain/localhost port?

## Common Patterns

### Pattern: Works in Development, Fails in Production
- Check CORS origins whitelist
- Check Firebase/Firestore credentials
- Check Cloud Storage bucket permissions
- Check service account permissions

### Pattern: Works for Some Users, Fails for Others
- Check email authorization in `backend/src/config/users.js`
- Ensure all users' emails are in ALLOWED_USERS list
- Check if email matches exactly (case-sensitive)

### Pattern: Works Sometimes, Fails Sometimes
- Network issue (unstable connection)
- Cloud Run instance restarting
- Temporary backend error
- Browser cache issue

Try:
1. Clear cache: Ctrl+Shift+Delete
2. Use incognito/private window
3. Try different network connection
4. Check backend logs for intermittent errors
