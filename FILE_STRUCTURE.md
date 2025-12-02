# PowerPlay Stream - Complete File Structure

## Directory Tree

```
PowerPlay-Stream/
│
├── 📄 README.md                          (Main documentation & setup guide)
├── 📄 PROJECT_SUMMARY.md                 (Project completion summary)
├── 📄 API.md                             (API endpoint reference)
├── 📄 DEPLOYMENT.md                      (GCP deployment guide)
├── 📄 ARCHITECTURE.md                    (System architecture & design)
├── 📄 .gitignore                         (Git ignore rules)
├── 📄 docker-compose.yml                 (Docker local development)
├── 📄 setup.sh                           (Linux/Mac setup script)
├── 📄 setup.bat                          (Windows setup script)
│
├── 📁 backend/                           (Node.js/Express REST API)
│   │
│   ├── 📄 package.json                   (Dependencies & scripts)
│   ├── 📄 .env.example                   (Environment variables template)
│   ├── 📄 Dockerfile                     (Container image for Cloud Run)
│   │
│   └── 📁 src/
│       │
│       ├── 📄 index.js                   (Application entry point)
│       │
│       ├── 📁 config/                    (Configuration files)
│       │   ├── 📄 database.js            (Cloud SQL connection)
│       │   ├── 📄 storage.js             (Cloud Storage setup)
│       │   ├── 📄 pubsub.js              (Cloud Pub/Sub setup)
│       │   └── 📄 vertexai.js            (Vertex AI setup)
│       │
│       ├── 📁 models/                    (Sequelize database models)
│       │   ├── 📄 User.js                (User model)
│       │   ├── 📄 Video.js               (Video model)
│       │   └── 📄 Caption.js             (Caption model)
│       │
│       ├── 📁 controllers/               (HTTP request handlers)
│       │   ├── 📄 videoController.js     (Video endpoint logic)
│       │   └── 📄 searchController.js    (Search endpoint logic)
│       │
│       ├── 📁 services/                  (Business logic layer)
│       │   ├── 📄 storageService.js      (Cloud Storage operations)
│       │   ├── 📄 videoService.js        (Video management logic)
│       │   ├── 📄 vertexAiService.js     (Search & AI logic)
│       │   └── 📄 userService.js         (User management logic)
│       │
│       ├── 📁 routes/                    (API route definitions)
│       │   ├── 📄 videoRoutes.js         (Video endpoints)
│       │   └── 📄 searchRoutes.js        (Search endpoints)
│       │
│       └── 📁 middleware/                (Express middleware)
│           ├── 📄 auth.js                (IAP authentication & authorization)
│           └── 📄 errorHandler.js        (Global error handling)
│
├── 📁 frontend/                          (React.js Single Page Application)
│   │
│   ├── 📄 package.json                   (Dependencies & scripts)
│   ├── 📄 Dockerfile                     (Container image)
│   │
│   ├── 📁 public/
│   │   └── 📄 index.html                 (HTML entry point)
│   │
│   └── 📁 src/
│       │
│       ├── 📄 App.jsx                    (Root React component)
│       ├── 📄 App.css                    (App styles)
│       ├── 📄 index.jsx                  (React ReactDOM render)
│       ├── 📄 index.css                  (Global styles)
│       │
│       ├── 📁 pages/                     (Page components)
│       │   ├── 📄 HomePage.jsx           (Main landing page)
│       │   └── 📄 LoginPage.jsx          (IAP login page)
│       │
│       ├── 📁 components/                (Reusable components)
│       │   ├── 📄 UploadDialog.jsx       (Video upload modal)
│       │   ├── 📄 VideoCard.jsx          (Video preview card)
│       │   ├── 📄 VideoPlayer.jsx        (Video playback modal)
│       │   └── 📄 SearchBar.jsx          (Search with suggestions)
│       │
│       ├── 📁 services/                  (API client layer)
│       │   └── 📄 api.js                 (Axios API client)
│       │
│       └── 📁 styles/                    (Component stylesheets)
│           ├── 📄 LoginPage.css
│           ├── 📄 HomePage.css
│           ├── 📄 VideoCard.css
│           ├── 📄 UploadDialog.css
│           ├── 📄 SearchBar.css
│           └── 📄 VideoPlayer.css
│
└── 📁 shared/                            (Shared utilities - placeholder)
    └── 📄 constants.js                   (Shared constants)
```

## File Count Summary

| Directory | Files | Type |
|-----------|-------|------|
| Root | 8 | Documentation + Config |
| Backend | 23 | Node.js/Express code |
| Frontend | 19 | React components |
| Shared | 1 | Utilities |
| **Total** | **51** | **All** |

## Key Files by Purpose

### Documentation
- `README.md` - Getting started guide
- `API.md` - Complete API reference
- `DEPLOYMENT.md` - Production deployment
- `ARCHITECTURE.md` - System design
- `PROJECT_SUMMARY.md` - Project overview

### Configuration
- `docker-compose.yml` - Local development
- `backend/.env.example` - Backend config template
- `frontend/public/index.html` - Frontend HTML entry
- `.gitignore` - Git rules

### Backend API
- `backend/src/index.js` - Server entry point
- `backend/src/routes/` - API endpoints
- `backend/src/controllers/` - Request handlers
- `backend/src/services/` - Business logic
- `backend/src/models/` - Database schemas
- `backend/src/config/` - Cloud service configs
- `backend/src/middleware/` - Express middleware

### Frontend UI
- `frontend/src/App.jsx` - Root component
- `frontend/src/pages/` - Page components
- `frontend/src/components/` - Reusable components
- `frontend/src/services/api.js` - API client
- `frontend/src/styles/` - Component styles

## Data Flow Through Files

### Upload Video
```
Frontend/components/UploadDialog.jsx
         ↓
Frontend/services/api.js (HTTP POST)
         ↓
Backend/src/routes/videoRoutes.js
         ↓
Backend/src/controllers/videoController.js
         ↓
Backend/src/services/videoService.js
         ↓
Backend/src/services/storageService.js (Cloud Storage)
Backend/src/config/database.js (Cloud SQL)
Backend/src/config/pubsub.js (Cloud Pub/Sub)
```

### Search Videos
```
Frontend/components/SearchBar.jsx
         ↓
Frontend/services/api.js (HTTP GET)
         ↓
Backend/src/routes/searchRoutes.js
         ↓
Backend/src/controllers/searchController.js
         ↓
Backend/src/services/vertexAiService.js
         ↓
Backend/src/config/vertexai.js (Vertex AI API)
         ↓
Backend/src/models/Video.js (Database query)
```

### Video Playback
```
Frontend/components/VideoPlayer.jsx
         ↓
Frontend/services/api.js (HTTP GET)
         ↓
Backend/src/routes/videoRoutes.js
         ↓
Backend/src/controllers/videoController.js
         ↓
Backend/src/services/videoService.js
         ↓
Backend/src/services/storageService.js (Get signed URL)
```

## Import Relationships

### Backend Dependencies
```
index.js
├── config/database.js
├── config/storage.js
├── config/pubsub.js
├── config/vertexai.js
├── routes/videoRoutes.js
│   └── controllers/videoController.js
│       └── services/videoService.js
│           ├── models/Video.js
│           ├── models/Caption.js
│           ├── services/storageService.js
│           └── config/pubsub.js
├── routes/searchRoutes.js
│   └── controllers/searchController.js
│       └── services/vertexAiService.js
│           └── models/Video.js
├── middleware/auth.js
└── middleware/errorHandler.js
```

### Frontend Dependencies
```
index.jsx
└── App.jsx
    ├── pages/HomePage.jsx
    │   ├── components/SearchBar.jsx
    │   │   └── services/api.js
    │   ├── components/UploadDialog.jsx
    │   │   └── services/api.js
    │   ├── components/VideoCard.jsx
    │   └── components/VideoPlayer.jsx
    │       └── services/api.js
    └── pages/LoginPage.jsx
        └── services/api.js
```

## Modification Guide

### Adding a New Feature

1. **Create Data Model**
   - Add new model file in `backend/src/models/`
   - Define schema using Sequelize

2. **Create Service**
   - Add service file in `backend/src/services/`
   - Implement business logic

3. **Create Controller**
   - Add controller file in `backend/src/controllers/`
   - Handle HTTP requests

4. **Create Routes**
   - Add routes in `backend/src/routes/`
   - Map endpoints to controllers

5. **Create Frontend Component**
   - Add component in `frontend/src/components/`
   - Implement UI with React

6. **Update API Client**
   - Add API methods in `frontend/src/services/api.js`
   - Define request/response handlers

7. **Add Styles**
   - Create CSS file in `frontend/src/styles/`
   - Import in component

## Environment-Specific Files

### Development
- `docker-compose.yml` - Local services
- `setup.sh` / `setup.bat` - Development setup
- `backend/.env` - Development environment

### Production
- `backend/Dockerfile` - Container image
- `frontend/Dockerfile` - Frontend container
- `.env.production` - Production environment
- Cloud configuration files (in GCP)

## Build & Distribution

### Backend Build
```
backend/
├── package.json (dependencies)
├── src/ (source code)
└── Dockerfile (containerization)
    ↓
Docker image → gcr.io/PROJECT/powerplay-backend
    ↓
Cloud Run deployment
```

### Frontend Build
```
frontend/
├── package.json (dependencies)
├── src/ (source code)
├── public/ (static assets)
└── Dockerfile (containerization)
    ↓
npm run build
    ↓
build/ (optimized bundle)
    ↓
Cloud Storage deployment
    ↓
Cloud CDN distribution
```

---

**Total Lines of Code**: ~2,500+ lines
**Total File Size**: ~150KB+ of code
**Languages Used**: JavaScript (Node.js, React), HTML, CSS
**Documentation**: 5 comprehensive guides

**Last Updated**: December 2, 2025
