# Security Features Quick Reference

## What Changed?

### New Security Layer Added
✅ **Virus/Malware Scanning** before uploading to Google Cloud Storage
✅ **File Validation** (size, type, signature)
✅ **Automatic Cleanup** of rejected files
✅ **Multiple Scanning Backends** (VirusTotal, ClamAV, Heuristic)

---

## Modified Endpoints

### 1. POST `/api/videos/upload`
**Changes:** Added security validation before GCS upload

**Request:**
```
POST /api/videos/upload
Content-Type: multipart/form-data

video: [FILE]          (required, validated for security)
thumbnail: [FILE]      (optional, validated for security)
title: "string"
description: "string"
tags: "tag1,tag2"
isPublic: "true" | "false"
```

**Security Checks:**
- ✅ File size (max 500MB)
- ✅ MIME type (video/* only)
- ✅ File signature (no executables)
- ✅ Virus scan (if configured)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": { "id": "...", "videoUrl": "..." }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Video file failed security checks",
  "errors": ["File size (600 MB) exceeds maximum (500 MB)"],
  "warnings": []
}
```

---

### 2. POST `/api/videos/:videoId/caption`
**Changes:** Added security validation for caption files

**Request:**
```
POST /api/videos/{videoId}/caption
Content-Type: multipart/form-data

caption: [FILE]       (required, validated for security)
language: "English"
languageCode: "en"
```

**Security Checks:**
- ✅ File size (max 50MB)
- ✅ MIME type (text files only)
- ✅ Virus scan (if configured)

---

### 3. POST `/api/videos/upload-chunk`
**Changes:** Added security validation for each chunk AND final combined file

**Request:**
```
POST /api/videos/upload-chunk
Content-Type: multipart/form-data

chunk: [FILE]         (required, validated for security)
uploadId: "string"    (required)
chunkIndex: 0         (required)
totalChunks: 5        (required)
title: "string"
```

**Security Checks Per Chunk:**
- ✅ File signature validation
- ✅ Virus scan (if configured)

**Security Checks On Final File:**
- ✅ File size (max 500MB)
- ✅ MIME type
- ✅ File signature
- ✅ Virus scan (if configured)

---

## Configuration

### Environment Variables

```env
# Choose one scanning backend:

# Option A: VirusTotal
VIRUSTOTAL_API_KEY=your_api_key

# Option B: ClamAV
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Option C: Heuristic (default fallback)
# No configuration needed
```

### Setup

**Quick Start:**
```bash
cd backend
npm install        # Installs clamscan dependency
cp .env.example .env
# Edit .env with your API key or ClamAV host
npm start
```

---

## Security Checks Performed

| Check | Time | Action if Failed |
|---|---|---|
| File Size | < 1ms | Reject, return error |
| MIME Type | < 1ms | Reject, return error |
| File Signature | 5-10ms | Reject, return error |
| Virus Scan | 500ms-10s | Reject, return error |

---

## File Validation Rules

### Allowed File Types
```
Video: video/mp4, video/mpeg, video/quicktime, video/x-msvideo, 
       video/x-flv, video/x-matroska, video/webm, video/ogg
Caption: text/plain, application/pdf, text/vtt, application/x-subrip
Thumbnail: image/jpeg, image/png
```

### Maximum Sizes
```
Video: 500 MB
Caption: 50 MB
Thumbnail: 10 MB
```

### Blocked Content
```
❌ Windows executables (.exe, .dll, .sys)
❌ Linux executables (.elf)
❌ Archive files (.zip, .rar, .7z)
❌ Script files (.sh, .bat, .py, .js)
❌ Embedded PHP/ASP code
❌ Shell commands (cmd.exe, bash, etc.)
❌ Database commands (DROP TABLE, etc.)
```

---

## Scanning Backends

### VirusTotal (Cloud-based)
**✅ Recommended for:** Cloud Run, serverless
**Speed:** 2-10s per file
**Cost:** Free (4 req/min, 500 req/day)
**Setup:**
```bash
export VIRUSTOTAL_API_KEY="your_key_here"
# Get key: https://www.virustotal.com/gui/my-apikey
```

### ClamAV (Local daemon)
**✅ Recommended for:** Docker, servers
**Speed:** 500ms-5s per file
**Cost:** Free, open-source
**Setup:**
```bash
docker run -d -p 3310:3310 clamav/clamav
```

### Heuristic (Fallback)
**✅ Recommended for:** Development
**Speed:** 10-50ms per file
**Cost:** Free, no dependencies
**Setup:** Automatic (no config needed)

---

## Testing

### Test Valid Upload
```bash
curl -X POST http://localhost:5000/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@my-video.mp4" \
  -F "title=My Video"
```
**Expected:** 201 Created ✅

### Test Oversized File
```bash
# File > 500MB will be rejected
```
**Expected:** 400 Bad Request ❌

### Test Executable File
```bash
# .exe file renamed as .mp4 will be detected and rejected
```
**Expected:** 400 Bad Request ❌

---

## Logging

### Security Logs (Visible in Console)
```
[SECURITY] Starting security checks for: video.mp4
[SECURITY] File size check passed: 245.5 MB
[SECURITY] MIME type validation: video/mp4
[SECURITY] Scanning with VirusTotal...
[SECURITY] Security check completed: valid=true
```

### Error Logs
```
[SECURITY] Security check FAILED for video: File size exceeds maximum
[UPLOAD] Rejected files are automatically deleted
```

---

## Performance Impact

| Check | Latency | Impact |
|---|---|---|
| All checks | 5-15s (ClamAV) | Moderate |
| All checks | 2-10s (VirusTotal) | Moderate |
| Without scanning | < 100ms | Negligible |

**Tip:** For better UX, show upload progress to users

---

## Error Handling

### Client Receives
```json
{
  "success": false,
  "message": "Video file failed security checks",
  "errors": [
    "File size (600 MB) exceeds maximum allowed size (500 MB)"
  ],
  "warnings": [
    "Virus scan service unavailable"
  ]
}
```

### User Should Do
1. Check file size
2. Check file format
3. Verify file is legitimate
4. Try again or contact support

---

## Deployment

### Docker with Security
```dockerfile
# Using VirusTotal (recommended for Cloud Run)
ENV VIRUSTOTAL_API_KEY=${VIRUSTOTAL_API_KEY}
```

### Google Cloud Run
```bash
gcloud run deploy powerplay-stream \
  --set-env-vars="VIRUSTOTAL_API_KEY=your_key"
```

### Docker Compose (with ClamAV)
```yaml
version: '3'
services:
  clamav:
    image: clamav/clamav
    ports:
      - "3310:3310"
  
  app:
    build: .
    environment:
      CLAMAV_HOST: clamav
      CLAMAV_PORT: 3310
    ports:
      - "5000:5000"
```

---

## Troubleshooting

### "Virus scan failed (non-blocking)"
✅ **Normal** - Scanning service unavailable, heuristic used instead

### "ClamAV scan failed: connect ECONNREFUSED"
❌ **Problem** - ClamAV daemon not running
✅ **Fix:** `docker run -d -p 3310:3310 clamav/clamav`

### "VirusTotal rate limited"
❌ **Problem** - Too many requests too fast
✅ **Fix:** Wait 15 seconds or upgrade API plan

### Slow uploads
❌ **Problem** - Virus scanning taking too long
✅ **Fix:** Use VirusTotal (offloads to cloud) or heuristic only

---

## Best Practices

1. ✅ Always validate file signatures
2. ✅ Use external scanning in production
3. ✅ Keep virus definitions updated
4. ✅ Log all security events
5. ✅ Monitor upload patterns
6. ✅ Clean up rejected files immediately
7. ✅ Alert on repeated failures
8. ✅ Educate users about file safety

---

## Documentation Files

📄 **SECURITY_IMPLEMENTATION.md** - Complete guide (comprehensive)
📄 **SECURITY_IMPLEMENTATION_SUMMARY.md** - Overview (quick reference)
📄 **security-setup.sh** - Automated setup script

---

## Support

For detailed documentation, see:
- `SECURITY_IMPLEMENTATION.md` - Full technical guide
- `SECURITY_IMPLEMENTATION_SUMMARY.md` - Overview and examples
- `.env.example` - Configuration template

---

**Status:** ✅ Ready for Production  
**Last Updated:** December 16, 2025
