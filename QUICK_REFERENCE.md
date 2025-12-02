# PowerPlay Stream - Quick Reference Guide

## 🚀 Quick Start (5 minutes)

### Windows
```bash
# Run setup
setup.bat

# Start with Docker
docker-compose up

# OR manually
cd backend && npm run dev
# In another terminal:
cd frontend && npm start
```

### Linux/Mac
```bash
# Run setup
chmod +x setup.sh
./setup.sh

# Start with Docker
docker-compose up

# OR manually
cd backend && npm run dev
# In another terminal:
cd frontend && npm start
```

**Frontend**: http://localhost:3000
**Backend API**: http://localhost:5000
**Database**: localhost:3306

---

## 📚 Documentation Quick Links

| Document | Purpose |
|----------|---------|
| **README.md** | Getting started, setup, features |
| **API.md** | Complete API reference & examples |
| **DEPLOYMENT.md** | Production deployment to GCP |
| **ARCHITECTURE.md** | System design & data flows |
| **PROJECT_SUMMARY.md** | Project overview & status |
| **FILE_STRUCTURE.md** | Complete file organization |
| **IMPLEMENTATION_CHECKLIST.md** | Feature completion checklist |

---

## 🔑 Key Endpoints

### Video Management
```
POST   /api/videos/upload                    Upload video
POST   /api/videos/:videoId/caption          Upload caption
GET    /api/videos/my-videos                 Get user's videos
GET    /api/videos/public/list               Get public videos
GET    /api/videos/:videoId                  Get video details
PATCH  /api/videos/:videoId/privacy          Toggle public/private
PATCH  /api/videos/:videoId/downloaded       Mark as downloaded
GET    /api/videos/:videoId/download         Get download URL
DELETE /api/videos/:videoId                  Soft delete video
DELETE /api/videos/:videoId/permanent        Permanent delete (admin)
```

### Search
```
GET /api/search/suggestions?query=...        Auto-suggestions
GET /api/search/semantic?query=...           Semantic search
GET /api/search/:videoId/similar             Similar videos
```

---

## 🗂 Directory Structure

```
backend/
├── src/
│   ├── config/           GCP service configs
│   ├── models/           Database models
│   ├── controllers/      API handlers
│   ├── services/         Business logic
│   ├── routes/           API endpoints
│   └── middleware/       Auth & errors
├── Dockerfile            Container image
└── package.json          Dependencies

frontend/
├── src/
│   ├── pages/            Page components
│   ├── components/       UI components
│   ├── services/         API client
│   ├── styles/           CSS files
│   └── App.jsx           Root component
├── public/               Static files
├── Dockerfile            Container image
└── package.json          Dependencies
```

---

## 🔐 Environment Variables

**Backend (.env)**
```
NODE_ENV=development
PORT=5000
GCP_PROJECT_ID=your-project-id
CLOUD_SQL_HOST=localhost:3306
CLOUD_SQL_USER=powerplay
CLOUD_SQL_PASSWORD=powerplay
CLOUD_SQL_DATABASE=powerplay_stream
GCS_BUCKET_NAME=your-bucket-name
PUBSUB_TOPIC=video-transcoding-events
VERTEX_AI_MODEL_ID=text-search-model
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📊 Database Models

### User
- id (UUID) - Primary key
- email, name - User info
- iapId - Google IAP ID
- role - User, Admin, SuperAdmin
- timestamps

### Video
- id (UUID) - Primary key
- userId - Foreign key to User
- title, description - Metadata
- tags, thumbnail URL, video URL
- isPublic, isDownloaded, isDeleted - Flags
- viewCount, embedded link
- timestamps

### Caption
- id (UUID) - Primary key
- videoId - Foreign key to Video
- language - English, Spanish, Turkish, Arabic, French
- captionUrl, cloudStoragePath

---

## 🎯 User Workflows

### Upload Video
1. Click "Upload Video"
2. Select video file
3. Add title, description, tags
4. Optional: Add thumbnail
5. Optional: Add captions
6. Set privacy (public/private)
7. Submit

### Search Videos
1. Type in search bar
2. See suggestions in real-time
3. Click suggestion or press Enter
4. View full search results

### Play Video
1. Click play icon on video
2. Player opens
3. Select captions if available
4. Watch video
5. Mark as downloaded if desired

### Manage Videos
1. View "My Videos"
2. Use action buttons:
   - **Play**: Watch video
   - **Download**: Mark as downloaded
   - **🔓/🔒**: Toggle privacy
   - **🗑**: Soft delete
   - **⚠ Permanent**: Delete (admin only)

---

## 🛠 Development Tips

### Common Commands

**Backend**
```bash
cd backend
npm install              # Install dependencies
npm run dev              # Run with nodemon
npm start                # Production run
```

**Frontend**
```bash
cd frontend
npm install              # Install dependencies
npm start                # Start dev server
npm run build            # Build for production
npm test                 # Run tests
```

**Docker**
```bash
docker-compose up        # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs
```

### Debugging

**Backend Logs**
- Check terminal where backend is running
- Errors show in console
- Cloud SQL connection issues are displayed

**Frontend Logs**
- Open browser DevTools (F12)
- Check Console tab for errors
- Network tab shows API calls

**Database**
- Access MySQL:
  ```bash
  mysql -h 127.0.0.1 -u powerplay -p powerplay_stream
  ```

---

## 🚀 Deployment Checklists

### Pre-Deployment
- [ ] Update `backend/.env` with GCP credentials
- [ ] Test all features locally
- [ ] Check API endpoints
- [ ] Review database schema
- [ ] Verify file uploads work

### GCP Deployment (see DEPLOYMENT.md)
- [ ] Create GCP project
- [ ] Enable required APIs
- [ ] Create Cloud SQL instance
- [ ] Create Cloud Storage bucket
- [ ] Deploy backend to Cloud Run
- [ ] Deploy frontend to Cloud Storage
- [ ] Configure IAP
- [ ] Test production endpoints

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify backups
- [ ] Test all features in production

---

## 🔒 Security Checklist

- [x] IAP authentication enabled
- [x] JWT token validation
- [x] Role-based authorization
- [x] Input validation
- [x] Error handling (no sensitive data in errors)
- [x] HTTPS configuration ready
- [x] Signed URLs for downloads
- [x] Service account permissions

---

## 📱 Frontend Components

### Pages
- **LoginPage** - IAP authentication
- **HomePage** - Main app with videos, search, upload

### Components
- **UploadDialog** - Video upload modal
- **VideoCard** - Video preview card with actions
- **VideoPlayer** - Video playback modal
- **SearchBar** - Search with auto-suggestions

### Features per Component
- **UploadDialog**: Drag-drop, thumbnails, captions, metadata
- **VideoCard**: Play, download, privacy toggle, delete
- **VideoPlayer**: Player, captions, download URL
- **SearchBar**: Type-ahead, suggestions, search submit

---

## 🎬 API Usage Examples

### Upload Video
```bash
curl -X POST http://localhost:5000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=My Video" \
  -F "description=My description" \
  -F "tags=education,tutorial" \
  -F "isPublic=true" \
  -F "video=@video.mp4" \
  -F "thumbnail=@thumb.jpg"
```

### Search Videos
```bash
curl "http://localhost:5000/api/search/suggestions?query=education" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Video Details
```bash
curl http://localhost:5000/api/videos/VIDEO_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Toggle Privacy
```bash
curl -X PATCH http://localhost:5000/api/videos/VIDEO_ID/privacy \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Port already in use** | Change PORT in .env |
| **Database connection failed** | Check MySQL is running on :3306 |
| **CORS error** | Check backend/src/index.js CORS config |
| **File upload fails** | Ensure GCP credentials are correct |
| **Search returns empty** | Check Vertex AI is configured |
| **Videos not playing** | Verify Cloud Storage URLs are accessible |

---

## 📈 Performance Tips

1. **Database**
   - Add indexes on frequently queried fields
   - Use connection pooling
   - Monitor slow queries

2. **Storage**
   - Use signed URLs with expiration
   - Implement CDN caching
   - Compress video files

3. **Frontend**
   - Enable code splitting
   - Lazy load components
   - Optimize bundle size

4. **Backend**
   - Cache frequently accessed data
   - Implement pagination
   - Use async operations

---

## 📞 Support Resources

### For Setup Issues
1. Check README.md
2. Review setup.sh or setup.bat
3. Check environment variables

### For API Issues
1. Check API.md
2. Review backend logs
3. Test with curl or Postman

### For Deployment
1. Follow DEPLOYMENT.md step-by-step
2. Check GCP console
3. Review Cloud Logging

### For Architecture Questions
1. Review ARCHITECTURE.md
2. Check data flow diagrams
3. Review file structure

---

## ⚡ Keyboard Shortcuts

### Frontend
- `Ctrl/Cmd + K` - Focus search (when implemented)
- `Esc` - Close dialogs

### Development
- `Ctrl/Cmd + C` - Stop server
- `Ctrl/Cmd + Shift + C` - DevTools

---

## 📅 Maintenance Schedule

- **Daily**: Check error logs
- **Weekly**: Backup database
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

---

## 🎓 Learning Path

1. **Start**: Read README.md
2. **Setup**: Run setup script
3. **Learn**: Review ARCHITECTURE.md
4. **Code**: Check frontend/backend structure
5. **Deploy**: Follow DEPLOYMENT.md

---

## 📄 File Quick Reference

| File | Purpose |
|------|---------|
| `backend/src/index.js` | Backend entry point |
| `frontend/src/App.jsx` | React root component |
| `backend/src/config/database.js` | DB connection |
| `frontend/src/services/api.js` | API client |
| `backend/src/routes/videoRoutes.js` | Video endpoints |
| `frontend/src/components/UploadDialog.jsx` | Upload UI |
| `docker-compose.yml` | Local dev setup |
| `backend/.env.example` | Config template |

---

**Last Updated**: December 2, 2025
**Version**: 1.0.0
