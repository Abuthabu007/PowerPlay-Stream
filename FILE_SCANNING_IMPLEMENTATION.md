# File Scanning Implementation

## Overview
Complete file scanning and validation system implemented at **both frontend and backend** to ensure uploaded files are safe before processing.

---

## Frontend Validation (`UploadDialog.jsx`)

### Video File Validation
**Function:** `validateVideoFile(file)`

**Checks:**
- ✅ **File Size**: Max 500MB
- ✅ **MIME Type**: MP4, MPEG, QuickTime, AVI, FLV, Matroska, WebM, OGG
- ✅ **File Extension**: .mp4, .avi, .mov, .mkv, .flv, .webm, .ogv, .m4v, .mpeg, .mpg
- ✅ **Suspicious Patterns**: Detects executable disguises (.exe, .bat, .cmd, .sh, .zip, .rar, .dll)

**Validation Triggers:**
- When file is dropped/selected in video dropzone
- Before submission to backend
- Real-time error feedback to user

### Thumbnail Image Validation
**Function:** `validateThumbnailFile(file)`

**Checks:**
- ✅ **File Size**: Max 10MB
- ✅ **MIME Type**: JPEG, PNG, WebP
- ✅ **File Extension**: .jpg, .jpeg, .png, .webp

**Features:**
- Auto-captures thumbnail at 1 second mark
- Manual override available
- Optional field

### Caption File Validation
**Function:** `validateCaptionFile(file)`

**Checks:**
- ✅ **File Size**: Max 5MB
- ✅ **Format**: VTT, SRT, ASS, SSA
- ✅ **MIME Type**: text/plain, text/vtt, application/x-subrip

**Features:**
- Per-language caption support
- Validation before adding to form

---

## Backend Security Service (`securityService.js`)

### Comprehensive Security Checks

#### 1. File Size Validation
```javascript
Max Video Size: 500MB (524,288,000 bytes)
Max Image Size: 10MB
```

#### 2. MIME Type Validation
**Allowed Video MIME Types:**
- video/mp4
- video/mpeg
- video/quicktime
- video/x-msvideo
- video/x-flv
- video/x-matroska
- video/webm
- video/ogg

**Allowed Image MIME Types:**
- image/jpeg
- image/jpg
- image/png
- image/webp

#### 3. File Signature Verification (Magic Bytes)

**Dangerous Signatures Detected:**
- `MZ` (4d5a) - Windows executable
- `ELF` (7f454c46) - Linux executable
- `ZIP` (504b0304) - ZIP archive
- `RAR` (526172) - RAR archive
- `SHEBANG` (23212f) - Shell script

**Valid Signatures Accepted:**
- `MP4` (00000020667479)
- `WEBM` (1a45dfa3)
- `FLV` (464c5601)
- `MOV` (00000018667479)
- `JPEG` (ffd8ff)
- `PNG` (89504e47)
- `GIF` (474946)
- `WEBP` (52494646)

#### 4. Virus & Malware Scanning

**Supported Backends:**
1. **VirusTotal API** (Rate limit: 4 req/min free tier)
   - Requires: `VIRUSTOTAL_API_KEY` env var
   - Hash-based detection
   
2. **ClamAV** (Local daemon)
   - Requires: ClamAV daemon running
   - Default: localhost:3310
   - Configurable via `CLAMAV_HOST`, `CLAMAV_PORT` env vars

3. **Google Safe Browsing API**
   - Requires: `GOOGLE_SAFE_BROWSING_KEY` env var

### Upload Flow with Validation

```
1. Frontend: User selects/drops file
   └─ validateVideoFile() → errors if failed
   
2. Frontend: File passes validation
   └─ FormData created, sent to backend
   
3. Backend: multipart upload received
   └─ File temporarily stored in uploads/
   
4. Backend: Security validation starts
   ├─ Check file size
   ├─ Check MIME type
   ├─ Check file signature (magic bytes)
   └─ Scan for viruses/malware
   
5. Backend: Result
   ├─ ✅ All checks pass → Store in Cloud Storage
   ├─ ⚠️  Warnings → Store but flag
   └─ ❌ Errors → Reject & cleanup
```

---

## Environment Variables

```bash
# Virus Scanning
VIRUSTOTAL_API_KEY=your_key_here
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
GOOGLE_SAFE_BROWSING_KEY=your_key_here

# File Size Limits (optional)
MAX_VIDEO_SIZE=524288000  # 500MB in bytes
MAX_IMAGE_SIZE=10485760   # 10MB in bytes
```

---

## Error Messages

### Frontend
- `File size exceeds maximum of 500MB`
- `Invalid video format. Allowed: MP4, AVI, MOV, MKV, FLV, WebM, OGG`
- `Invalid file extension`
- `Suspicious file name detected`
- `Thumbnail size exceeds maximum of 10MB`
- `Invalid image format. Allowed: JPG, PNG, WebP`
- `Caption error: Invalid caption format`

### Backend
- `Video file failed security checks`
- `Malware detected`
- `File signature does not match MIME type`
- `File contains dangerous signatures`
- `File size exceeds limit`

---

## Security Best Practices

1. **Never Trust Client-Side Only**: Frontend validation is UX enhancement, backend validation is security requirement ✅
2. **Magic Bytes Verification**: Prevents renamed executables ✅
3. **MIME Type + Extension Check**: Double validation ✅
4. **Virus Scanning**: Multiple backend options ✅
5. **File Cleanup**: Temporary files cleaned if validation fails ✅
6. **Detailed Logging**: All checks logged for audit trail ✅

---

## Testing File Upload

### Valid Files
```
✅ video.mp4 (MP4 video)
✅ video.mov (QuickTime video)
✅ video.mkv (Matroska video)
✅ thumbnail.jpg (JPEG image)
✅ captions.vtt (WebVTT captions)
```

### Invalid Files (Will Be Rejected)
```
❌ video.mp4.exe (Executable disguised as video)
❌ video.zip (Archive file)
❌ malware.exe (Executable)
❌ script.sh (Shell script)
❌ huge_video.mp4 (>500MB)
❌ image.exe (Executable with image extension)
```

---

## Implementation Checklist

- ✅ Frontend file type validation
- ✅ Frontend file size validation
- ✅ Frontend suspicious pattern detection
- ✅ Backend MIME type validation
- ✅ Backend file size validation
- ✅ Backend magic bytes verification
- ✅ Backend virus scanning integration
- ✅ Error handling and user feedback
- ✅ Temporary file cleanup
- ✅ Detailed logging

---

## Next Steps (Optional Enhancements)

1. Add video codec validation (extract and verify video codec)
2. Add image dimension validation (prevent huge image uploads)
3. Add EXIF data stripping (privacy)
4. Add container format validation (verify MP4 container integrity)
5. Add frame analysis (detect suspicious content)
6. Add audio analysis (detect anomalies in audio stream)

