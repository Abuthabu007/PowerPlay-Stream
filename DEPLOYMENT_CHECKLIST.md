# Security Implementation Checklist

## ✅ What Was Implemented

- [x] **Security Service Created** - `backend/src/services/securityService.js`
  - File size validation
  - MIME type validation
  - File signature (magic bytes) analysis
  - VirusTotal API integration
  - ClamAV daemon support
  - Heuristic scanning fallback

- [x] **Video Controller Updated** - `backend/src/controllers/videoController.js`
  - `uploadVideo()` - Added security checks
  - `uploadCaption()` - Added security checks
  - `uploadVideoChunk()` - Added security checks for chunks and combined file
  - Automatic cleanup of rejected files

- [x] **Dependencies Updated** - `backend/package.json`
  - Added `clamscan@^2.1.3` for ClamAV integration

- [x] **Environment Configuration** - `backend/.env.example`
  - VirusTotal API key option
  - ClamAV host/port options
  - Security settings templates

- [x] **Documentation Created**
  - [x] `SECURITY_IMPLEMENTATION.md` - Comprehensive technical guide
  - [x] `SECURITY_IMPLEMENTATION_SUMMARY.md` - Quick overview and examples
  - [x] `SECURITY_QUICK_REFERENCE.md` - Quick reference card
  - [x] `security-setup.sh` - Automated setup script

---

## 📋 Pre-Deployment Checklist

### Local Testing

- [ ] Install dependencies
  ```bash
  cd backend
  npm install
  ```

- [ ] Copy environment template
  ```bash
  cp .env.example .env
  ```

- [ ] Test without external scanning
  ```bash
  npm start
  # Should work with heuristic scanning only
  ```

- [ ] Test valid video upload
  ```bash
  curl -X POST http://localhost:5000/api/videos/upload \
    -F "video=@test.mp4" \
    -F "title=Test"
  # Should return 201 Created
  ```

- [ ] Test oversized file rejection
  ```bash
  # Create 600MB+ file and upload
  # Should return 400 with size error
  ```

- [ ] Test wrong file type rejection
  ```bash
  # Rename .txt as .mp4 and upload
  # Should return 400 with MIME type error
  ```

### Backend Security Options

- [ ] **Option A: VirusTotal Setup**
  - [ ] Get free API key from https://www.virustotal.com/gui/my-apikey
  - [ ] Add to `.env`:
    ```env
    VIRUSTOTAL_API_KEY=your_api_key_here
    ```
  - [ ] Test upload (should call VirusTotal API)

- [ ] **Option B: ClamAV Setup**
  - [ ] Start ClamAV daemon
    ```bash
    docker run -d -p 3310:3310 clamav/clamav
    ```
  - [ ] Wait for initialization (1-2 minutes)
  - [ ] Add to `.env`:
    ```env
    CLAMAV_HOST=localhost
    CLAMAV_PORT=3310
    ```
  - [ ] Test upload (should call ClamAV)

- [ ] **Option C: Heuristic Only**
  - [ ] Uses automatic fallback
  - [ ] No additional setup needed

### Code Review

- [ ] Verify `securityService.js` is complete
  - [ ] Has 493 lines of code
  - [ ] All scanning backends implemented
  - [ ] Error handling included

- [ ] Verify `videoController.js` updated
  - [ ] `uploadVideo()` has security checks
  - [ ] `uploadCaption()` has security checks
  - [ ] `uploadVideoChunk()` has security checks
  - [ ] File cleanup on rejection

- [ ] Verify `package.json` has clamscan
  - [ ] `"clamscan": "^2.1.3"` in dependencies

---

## 🚀 Deployment Checklist

### For Cloud Run (Recommended: VirusTotal)

- [ ] Configure VirusTotal API key
  ```bash
  gcloud secrets create virustotal-api-key --data-file=- <<< "your_key"
  ```

- [ ] Update Dockerfile.monolithic (if needed)
  ```dockerfile
  ENV VIRUSTOTAL_API_KEY=${VIRUSTOTAL_API_KEY}
  ```

- [ ] Deploy with environment variable
  ```bash
  gcloud run deploy powerplay-stream \
    --set-env-vars="VIRUSTOTAL_API_KEY=projects/PROJECT/secrets/virustotal-api-key/versions/latest"
  ```

- [ ] Test deployed endpoint
  ```bash
  curl -X POST https://powerplay-stream-*.run.app/api/videos/upload \
    -F "video=@test.mp4" \
    -F "title=Test"
  ```

### For Docker Compose (Recommended: ClamAV)

- [ ] Create docker-compose.yml
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

- [ ] Start services
  ```bash
  docker-compose up
  ```

- [ ] Wait for ClamAV initialization (1-2 min)

- [ ] Test local endpoint
  ```bash
  curl -X POST http://localhost:5000/api/videos/upload \
    -F "video=@test.mp4"
  ```

### For Kubernetes (Optional)

- [ ] Create ConfigMap for VirusTotal API key
- [ ] Create Secret for credentials
- [ ] Update deployment with environment variables
- [ ] Test with port-forward

---

## 🧪 Testing Checklist

### Happy Path

- [ ] Valid MP4 upload (should succeed)
- [ ] Valid MOV upload (should succeed)
- [ ] Valid with thumbnail (should succeed)
- [ ] Chunked upload (should succeed)
- [ ] Caption upload (should succeed)

### Security Validation

- [ ] Oversized file (500MB+) - should fail
- [ ] Empty file - should fail
- [ ] .exe renamed as .mp4 - should fail
- [ ] .zip file - should fail
- [ ] Script file - should fail

### Error Handling

- [ ] Test with ClamAV offline - should fallback to heuristic
- [ ] Test with invalid VirusTotal key - should use heuristic
- [ ] Test with missing MIME type - should reject
- [ ] Test partial upload - should cleanup
- [ ] Test connection timeout - should error gracefully

### Performance Testing

- [ ] Time valid video upload (should be < 15 seconds)
- [ ] Time oversized file rejection (should be < 1 second)
- [ ] Monitor CPU/memory during scan
- [ ] Monitor disk space usage

---

## 📊 Monitoring Checklist

- [ ] Enable logging
  ```env
  SECURITY_DEBUG_MODE=true
  ```

- [ ] Review logs in production
  ```bash
  # Cloud Run
  gcloud run logs read powerplay-stream --limit 50

  # Docker
  docker logs -f container_id
  ```

- [ ] Set up alerts
  - [ ] Alert on upload failures
  - [ ] Alert on repeated failures from same user
  - [ ] Alert on unusual file sizes
  - [ ] Alert on ClamAV daemon down

- [ ] Monitor metrics
  - [ ] Total uploads per day
  - [ ] Security failures per day
  - [ ] Average scan time
  - [ ] Disk usage

---

## 📝 Documentation Checklist

- [ ] Read `SECURITY_IMPLEMENTATION.md`
- [ ] Read `SECURITY_IMPLEMENTATION_SUMMARY.md`
- [ ] Review `SECURITY_QUICK_REFERENCE.md`
- [ ] Run `security-setup.sh`
- [ ] Share documentation with team
- [ ] Update team wiki/docs

---

## 🔄 Maintenance Checklist (Weekly)

- [ ] Review security logs
- [ ] Check ClamAV definitions are updated
  ```bash
  # In container
  freshclam
  ```
- [ ] Check VirusTotal API rate limits
- [ ] Review any security events
- [ ] Test manual upload

---

## 🔄 Maintenance Checklist (Monthly)

- [ ] Update `clamscan` dependency
  ```bash
  npm update clamscan
  ```
- [ ] Review security vulnerabilities
  ```bash
  npm audit
  npm audit fix
  ```
- [ ] Update virus definitions
- [ ] Review upload patterns for anomalies
- [ ] Test disaster recovery
- [ ] Update documentation if needed

---

## 🆘 Troubleshooting Checklist

### If Upload Fails

- [ ] Check logs: `[SECURITY] Starting security checks for`
- [ ] Verify file size < 500MB
- [ ] Verify MIME type is video/*
- [ ] Check backend is running
- [ ] Verify API key is valid (if using VirusTotal)
- [ ] Verify ClamAV is running (if using ClamAV)

### If Scanning is Slow

- [ ] Check network connectivity
- [ ] Check ClamAV CPU/memory
- [ ] Consider using heuristic only
- [ ] Consider using VirusTotal (offloads to cloud)

### If Files Are Rejected

- [ ] Check error message
- [ ] Verify file is legitimate
- [ ] Try different file format
- [ ] Check if file is too large
- [ ] Contact support with file details

---

## ✨ Final Steps

- [ ] All checklist items completed
- [ ] Documentation reviewed
- [ ] Team trained on new security features
- [ ] Monitoring in place
- [ ] Backup and recovery tested
- [ ] Ready for production deployment

---

## 📞 Support Resources

- **Documentation:** `/SECURITY_IMPLEMENTATION.md`
- **Quick Ref:** `/SECURITY_QUICK_REFERENCE.md`
- **Setup Script:** `/security-setup.sh`
- **Code:** `/backend/src/services/securityService.js`
- **Config:** `/backend/.env.example`

---

**Status:** ✅ Complete and Ready
**Date:** December 16, 2025
**Version:** 1.0

---

## Sign-Off

- [ ] Developer tested and approved
- [ ] Security team reviewed
- [ ] DevOps/Infrastructure reviewed
- [ ] Team lead approved
- [ ] Ready for production

**Developer:** ________________ **Date:** ________
**Security:** _________________ **Date:** ________
**DevOps:** ___________________ **Date:** ________
**Lead:** _____________________ **Date:** ________
