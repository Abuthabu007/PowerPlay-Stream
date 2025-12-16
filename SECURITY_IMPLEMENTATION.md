# Security & Virus Scanning Implementation

## Overview

A comprehensive security layer has been added to prevent malicious files from being uploaded to Google Cloud Storage. The implementation includes:

- **File Size Validation** - Prevents oversized files
- **MIME Type Validation** - Ensures correct file types
- **File Signature Analysis** - Detects file type mismatches (magic bytes)
- **Virus/Malware Scanning** - Multiple backend support
- **Heuristic Detection** - Pattern-based threat detection

## Features

### 1. File Size Validation
- Maximum video file size: **500MB** (configurable)
- Prevents empty files
- Enforces storage quotas

### 2. MIME Type Validation
Allowed video MIME types:
- `video/mp4`
- `video/mpeg`
- `video/quicktime`
- `video/x-msvideo`
- `video/x-flv`
- `video/x-matroska`
- `video/webm`
- `video/ogg`

### 3. File Signature (Magic Bytes) Detection
Blocks files with suspicious signatures:
- Windows executables (`MZ` header)
- Linux executables (`ELF` header)
- ZIP archives (`PK` header)
- RAR archives
- Shell scripts
- Embedded code patterns

### 4. Virus & Malware Scanning

#### Option A: VirusTotal API (Cloud-based)
**Pros:** Comprehensive threat database, cloud-based
**Cons:** Requires API key, rate limited (4 req/min free tier)

```bash
# Setup
export VIRUSTOTAL_API_KEY="your_api_key_here"
```

**Cost:** Free tier available, paid plans for higher limits

#### Option B: ClamAV (Local Daemon)
**Pros:** Free, open-source, no rate limits
**Cons:** Requires local daemon, higher CPU usage

```bash
# Setup (Docker)
docker run -d -p 3310:3310 clamav/clamav

# Environment variables
export CLAMAV_HOST="localhost"
export CLAMAV_PORT="3310"
```

#### Option C: Heuristic Scanning (Fallback)
**Pros:** Always available, no dependencies
**Cons:** Limited detection, pattern-based only

Detects:
- `eval()` functions
- Base64 encoding (suspicious)
- Command shell execution
- SQL injection patterns
- PowerShell commands

### 5. Automatic Cleanup
- Failed security checks trigger automatic file deletion
- Prevents disk space exhaustion
- Removes temporary chunk files

## Configuration

### Environment Variables

```env
# VirusTotal (optional)
VIRUSTOTAL_API_KEY=your_virustotal_api_key

# ClamAV (optional)
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Google Safe Browsing (optional)
GOOGLE_SAFE_BROWSING_KEY=your_api_key
```

### Modified Files

```javascript
// Security service
backend/src/services/securityService.js

// Updated controllers
backend/src/controllers/videoController.js
- uploadVideo()          // Added security check
- uploadCaption()        // Added security check
- uploadVideoChunk()     // Added security check

// New dependency
backend/package.json
- Added: clamscan@^2.1.3
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "uuid",
    "title": "My Video",
    "videoUrl": "https://..."
  }
}
```

### Security Check Failed Response
```json
{
  "success": false,
  "message": "Video file failed security checks",
  "errors": [
    "File size (600 MB) exceeds maximum allowed size (500 MB)",
    "Dangerous file signature detected: Windows executable"
  ],
  "warnings": [
    "File flagged by scanner: Suspicious pattern detected"
  ]
}
```

## Security Check Flow

### Standard Upload (`/upload`)
```
1. File received via multipart/form-data
2. Multer saves to temp location
3. SECURITY CHECK:
   ├─ File size validation
   ├─ MIME type validation
   ├─ File signature analysis
   └─ Virus/malware scanning
4. If passed → Upload to GCS
5. If failed → Delete file & return error
```

### Chunked Upload (`/upload-chunk`)
```
1. Each chunk validated individually
2. Chunks combined into single file
3. SECURITY CHECK on final combined file:
   ├─ File size validation
   ├─ MIME type validation
   ├─ File signature analysis
   └─ Virus/malware scanning
4. If passed → Upload to GCS
5. If failed → Delete combined file & all chunks
```

### Caption Upload (`/:videoId/caption`)
```
1. Caption file received
2. SECURITY CHECK:
   ├─ File size validation (50MB max for captions)
   ├─ MIME type validation
   ├─ Malware scanning
3. If passed → Upload to GCS
4. If failed → Delete file & return error
```

## Testing

### Test Cases

```javascript
// Test 1: Valid video upload
POST /api/videos/upload
Content-Type: multipart/form-data
- video: valid_video.mp4
- title: "My Video"
// Expected: 201 Created

// Test 2: Oversized file
POST /api/videos/upload
- video: large_video_600mb.mp4
// Expected: 400 Bad Request
// Error: "File size (600 MB) exceeds maximum allowed size (500 MB)"

// Test 3: Wrong MIME type
POST /api/videos/upload
- video: malware.exe (with video/mp4 MIME type)
// Expected: 400 Bad Request
// Error: "Dangerous file signature detected: Windows executable"

// Test 4: Infected file (if ClamAV enabled)
POST /api/videos/upload
- video: eicar_test_file.zip (EICAR test virus)
// Expected: 400 Bad Request
// Error: "Malware detected: [virus name]"

// Test 5: Chunked upload with security check
POST /api/videos/upload-chunk
- uploadId: "abc123"
- chunkIndex: 0
- totalChunks: 5
- chunk: data
// Expected: 200 OK (chunk saved)
// On final chunk: Full security validation performed
```

### Manual Testing

```bash
# Test with curl
curl -X POST http://localhost:5000/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@test.mp4" \
  -F "title=Test Video"

# Test with oversized file (5GB)
dd if=/dev/zero of=large_file.mp4 bs=1G count=5
curl -X POST http://localhost:5000/api/videos/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@large_file.mp4"
```

## Monitoring & Logging

### Log Format
```
[SECURITY] Starting security checks for: video.mp4
[SECURITY] File size check passed: 245.5 MB
[SECURITY] MIME type validation: video/mp4
[SECURITY] File signature: 66747970 (valid)
[SECURITY] Scanning with VirusTotal...
[SECURITY] Security check completed: valid=true, errors=[], warnings=[]
```

### Dashboard Metrics (Optional)
- Total files scanned
- Security failures rate
- Threat types detected
- Average scan time
- Virus definitions update status

## Performance Impact

| Check | Time | Impact |
|-------|------|--------|
| File Size | < 1ms | Negligible |
| MIME Type | < 1ms | Negligible |
| File Signature | 5-10ms | Minor |
| ClamAV Scan | 500ms - 5s | Moderate |
| VirusTotal Scan | 2-10s | High (if file not cached) |
| Heuristic Scan | 10-50ms | Minor |

**Recommendation:** Use ClamAV for best balance of security and performance.

## Deployment

### Docker Setup with ClamAV

```dockerfile
# Dockerfile.monolithic (updated)
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src ./src

FROM node:18-alpine AS final
WORKDIR /app/backend

# Install ClamAV
RUN apk add --no-cache clamav clamav-daemon

# Copy application
COPY --from=backend-builder /app/backend ./

# Create ClamAV socket directory
RUN mkdir -p /var/run/clamav

ENV NODE_ENV=production
ENV CLAMAV_HOST=localhost
ENV CLAMAV_PORT=3310

CMD ["sh", "-c", "clamd & node src/index.js"]
```

### Google Cloud Run Deployment

**Note:** ClamAV daemon may not work well on Cloud Run due to resource constraints.
**Recommendation:** Use VirusTotal API instead.

```bash
# Set VirusTotal API key as secret
gcloud secrets create virustotal-api-key --data-file=- <<< "your_key"

# Update Cloud Run environment
gcloud run deploy powerplay-stream \
  --set-env-vars="VIRUSTOTAL_API_KEY=projects/PROJECT/secrets/virustotal-api-key/versions/latest"
```

## Troubleshooting

### Issue: VirusTotal API Rate Limiting
**Solution:** Wait 15 seconds between requests or upgrade API plan

### Issue: ClamAV Daemon Not Running
**Error:** "ClamAV scan failed: connect ECONNREFUSED"
**Solution:**
```bash
# Check if daemon is running
ps aux | grep clamd

# Restart daemon
clamd

# Or use Docker
docker run -d --name clamav -p 3310:3310 clamav/clamav
```

### Issue: Files Stuck in "Scanning"
**Solution:** Check virus definitions are up to date:
```bash
freshclam  # Update ClamAV definitions
```

### Issue: High Memory Usage
**Solution:**
- Disable ClamAV, use heuristic scanning only
- Use VirusTotal instead (offloads to cloud)
- Reduce max file size

## Security Best Practices

1. **Always** validate file signatures (magic bytes)
2. **Use** external scanning for critical systems (VirusTotal)
3. **Combine** multiple scanning methods (defense in depth)
4. **Monitor** upload patterns for anomalies
5. **Keep** virus definitions updated (for ClamAV)
6. **Log** all security events
7. **Alert** on repeated failures (potential attacks)
8. **Isolate** uploaded files during scanning
9. **Quarantine** suspicious files separately
10. **Educate** users about file safety

## Future Enhancements

- [ ] Machine learning based file classification
- [ ] YARA rule-based detection
- [ ] Behavioral analysis during streaming
- [ ] Integration with AWS GuardDuty
- [ ] Support for Google Cloud Security Command Center
- [ ] Real-time threat intelligence feeds
- [ ] File quarantine and review dashboard
- [ ] Admin dashboard for security metrics

## References

- [VirusTotal API Documentation](https://developers.virustotal.com/reference)
- [ClamAV Documentation](https://www.clamav.net/)
- [File Magic Numbers](https://en.wikipedia.org/wiki/List_of_file_signatures)
- [OWASP File Upload Security](https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload)
