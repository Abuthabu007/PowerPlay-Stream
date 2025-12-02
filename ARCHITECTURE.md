# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      End Users                              │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────────────┐
│              Google Cloud CDN                               │
│         (Frontend Static Assets)                            │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│        Google Identity-Aware Proxy (IAP)                    │
│         (Authentication & Authorization)                    │
└──────────────┬──────────────────────────────────────────────┘
               │ REST API (HTTP/JSON)
┌──────────────▼──────────────────────────────────────────────┐
│              Cloud Run Service                              │
│         (Node.js/Express Backend)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ API Routes (Video, Search, Upload)                   │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Controllers & Services (Business Logic)              │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Middleware (Auth, Error Handling, Validation)        │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴───────┬──────────────┬──────────────┐
       │               │              │              │
       ▼               ▼              ▼              ▼
  ┌────────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐
  │ Cloud SQL  │ │ Cloud    │ │ Cloud      │ │  Vertex AI   │
  │ (MySQL)    │ │ Storage  │ │ Pub/Sub    │ │ (Search)     │
  │            │ │ (Videos) │ │(Transcoding)│ │              │
  └────────────┘ └──────────┘ └────────────┘ └──────────────┘
```

## Component Details

### 1. Frontend (React.js)

**Responsibilities:**
- User interface and interaction
- Client-side routing
- Form handling and validation
- Video player integration
- Search UI with suggestions
- File upload handling

**Key Components:**
- `HomePage`: Main application interface
- `UploadDialog`: Video upload modal
- `VideoCard`: Video preview card
- `VideoPlayer`: Video playback player
- `SearchBar`: Search with auto-suggestions
- `LoginPage`: IAP authentication

**Technologies:**
- React 18
- React Router for navigation
- Axios for HTTP requests
- React Player for video playback
- React Dropzone for file uploads

### 2. Backend (Node.js/Express)

**Responsibilities:**
- REST API endpoints
- Request validation
- Business logic
- Database operations
- File management
- Event publishing

**Architecture:**
```
Request → Middleware → Routes → Controllers → Services → Database
           ↓
        (Auth, CORS, Validation)
```

**Layers:**

1. **Routes** (`/routes`)
   - Define API endpoints
   - Route parameters
   - Request methods

2. **Controllers** (`/controllers`)
   - Handle HTTP requests/responses
   - Input validation
   - Call services
   - Return responses

3. **Services** (`/services`)
   - Business logic
   - Database queries
   - External API calls
   - Data transformation

4. **Models** (`/models`)
   - Database schema
   - Sequelize ORM models
   - Relationships

5. **Middleware** (`/middleware`)
   - IAP authentication
   - Error handling
   - Request logging
   - CORS handling

### 3. Database (Cloud SQL - MySQL)

**Schema:**

```
┌─────────────────────┐
│      Users          │
├─────────────────────┤
│ id (UUID)           │
│ email (unique)      │
│ name                │
│ iapId (unique)      │
│ role (enum)         │
│ isActive            │
│ createdAt           │
│ updatedAt           │
└─────────────────────┘
        │
        │ 1:N
        │
┌─────────────────────────────────┐
│      Videos                     │
├─────────────────────────────────┤
│ id (UUID)                       │
│ userId (FK)                     │
│ title                           │
│ description                     │
│ tags (JSON)                     │
│ videoUrl                        │
│ thumbnailUrl                    │
│ isPublic (boolean)              │
│ isDownloaded (boolean)          │
│ isDeleted (boolean) [soft delete]
│ viewCount                       │
│ transcodingStatus (enum)        │
│ createdAt                       │
│ updatedAt                       │
└─────────────────────────────────┘
        │
        │ 1:N
        │
┌──────────────────────┐
│    Captions          │
├──────────────────────┤
│ id (UUID)            │
│ videoId (FK)         │
│ language (enum)      │
│ languageCode         │
│ captionUrl           │
│ createdAt            │
│ updatedAt            │
└──────────────────────┘
```

### 4. Cloud Storage (Google Cloud Storage)

**Bucket Structure:**
```
gs://powerplay-stream-bucket/
├── videos/
│   ├── {userId}/
│   │   ├── {videoId}/
│   │   │   ├── video/
│   │   │   │   └── filename.mp4
│   │   │   ├── thumbnail/
│   │   │   │   └── thumbnail.jpg
│   │   │   └── captions/
│   │   │       ├── english/
│   │   │       │   └── captions.vtt
│   │   │       ├── spanish/
│   │   │       └── ...
```

**Access Pattern:**
- Public access via signed URLs
- Time-limited download URLs (1 hour default)
- Service account access for uploads

### 5. Event Processing (Cloud Pub/Sub)

**Message Flow:**
```
Video Upload → Backend → Publish Event → Pub/Sub Topic
                                              ↓
                                      Transcoding Service
                                              ↓
                                         Update Status
```

**Message Schema:**
```json
{
  "videoId": "uuid",
  "eventType": "video_uploaded|transcoding_complete|transcoding_failed",
  "timestamp": "2025-12-02T10:00:00Z"
}
```

### 6. Search (Vertex AI)

**Implementation:**
1. **Current**: Metadata-based search (title, description, tags)
2. **Future**: Semantic search using Vertex AI embeddings
3. **Features**:
   - Auto-suggestions on input
   - Semantic search results
   - Similar video recommendations

## Data Flow Diagrams

### Video Upload Flow

```
1. User selects video files
        ↓
2. Frontend validates files
        ↓
3. POST /api/videos/upload with multipart form
        ↓
4. Backend receives request
        ↓
5. IAP middleware validates token
        ↓
6. Controller validates input
        ↓
7. Create video metadata record (database)
        ↓
8. Upload video to Cloud Storage
        ↓
9. Upload thumbnail to Cloud Storage
        ↓
10. Generate embedded link
        ↓
11. Publish transcoding event to Pub/Sub
        ↓
12. Return response to frontend
        ↓
13. User can upload captions (optional)
```

### Video Search Flow

```
1. User types in search bar
        ↓
2. Real-time suggestions (debounced)
        ↓
3. GET /api/search/suggestions?query=...
        ↓
4. Backend queries videos table (metadata search)
        ↓
5. Return top 5 suggestions
        ↓
6. User selects or submits search
        ↓
7. GET /api/search/semantic?query=...
        ↓
8. Backend calls Vertex AI for embeddings
        ↓
9. Return ranked results
        ↓
10. Frontend displays results
```

### Video Playback Flow

```
1. User clicks play on video card
        ↓
2. Frontend opens video player modal
        ↓
3. ReactPlayer loads video from videoUrl
        ↓
4. User can select captions (if available)
        ↓
5. View count incremented
        ↓
6. User can download/mark as downloaded
        ↓
7. Download URL requested
        ↓
8. GET /api/videos/{videoId}/download
        ↓
9. Backend generates signed URL
        ↓
10. Frontend redirects to signed URL
        ↓
11. Browser downloads from Cloud Storage
```

## Security Architecture

### Authentication Flow

```
┌─────────────────────┐
│    User Browser     │
└──────────┬──────────┘
           │
           │ 1. Request to application
           │
┌──────────▼──────────────────────────────────────┐
│        Google Identity-Aware Proxy (IAP)        │
│                                                  │
│  ☑ User authenticated?                          │
│  ☑ Valid credentials?                           │
│  ☑ Authorized?                                  │
└──────────┬──────────────────────────────────────┘
           │
           │ 2. Request + IAP JWT Token
           │
┌──────────▼──────────────────────────────────────┐
│        Cloud Run Backend Service                │
│                                                  │
│  • iapAuth middleware verifies token           │
│  • Extracts user information (email, sub, etc.) │
│  • Attaches user to request object              │
│  • Passes to route handlers                     │
└──────────────────────────────────────────────────┘
```

### Authorization Levels

1. **Public**: No authentication required
   - Get public videos
   - Search public videos

2. **Authenticated**: IAP token required
   - Upload videos
   - Manage own videos
   - Search with suggestions

3. **Admin**: Role-based access
   - Moderate content
   - View user statistics

4. **Superadmin**: Special privileges
   - Permanent delete videos
   - Manage users
   - System administration

## Deployment Architecture

### Development

- Local Docker Compose
- Mock Cloud services
- SQLite or local MySQL

### Production

```
┌────────────────────────────────────────────────────────┐
│                 Google Cloud Platform                  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Frontend Distribution                           │ │
│  │ ┌────────────────────────────────────────────┐  │ │
│  │ │ Cloud CDN                                  │  │ │
│  │ │ ├─ Cloud Storage (static assets)          │  │ │
│  │ │ └─ Cache layer                            │  │ │
│  │ └────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Backend Services                                │ │
│  │ ┌────────────────────────────────────────────┐  │ │
│  │ │ Cloud Run (Containerized Node.js App)     │  │ │
│  │ │ ├─ Auto-scaling                           │  │ │
│  │ │ ├─ Health checks                          │  │ │
│  │ │ └─ Load balancing                         │  │ │
│  │ └────────────────────────────────────────────┘  │ │
│  │ ┌────────────────────────────────────────────┐  │ │
│  │ │ Identity-Aware Proxy (IAP)                │  │ │
│  │ │ ├─ Authentication                         │  │ │
│  │ │ ├─ Authorization                          │  │ │
│  │ │ └─ SSL/TLS termination                    │  │ │
│  │ └────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Data Services                                   │ │
│  │ ├─ Cloud SQL (MySQL) - Metadata              │ │
│  │ ├─ Cloud Storage - Videos & Captions         │ │
│  │ └─ Cloud Pub/Sub - Events                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Analytics & Monitoring                         │ │
│  │ ├─ Cloud Logging                              │ │
│  │ ├─ Cloud Monitoring                           │ │
│  │ ├─ Vertex AI (Search)                         │ │
│  │ └─ Error Reporting                            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Technology Rationale

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Frontend** | React.js | Modern, component-based, large ecosystem |
| **Backend** | Node.js/Express | JavaScript, fast, lightweight, good for I/O |
| **Database** | Cloud SQL (MySQL) | Managed, scalable, relational data model fits |
| **Storage** | Cloud Storage | Object storage, global access, cost-effective |
| **Authentication** | Google IAP | Enterprise-grade, integrated with GCP |
| **Search** | Vertex AI | Semantic search, ML-powered, scalable |
| **Events** | Cloud Pub/Sub | Async processing, decoupled, reliable |
| **Hosting** | Cloud Run | Serverless, auto-scaling, containerized |

## Future Enhancements

1. **Real-time Collaboration**
   - WebSocket for live updates
   - Cloud Firestore for real-time sync

2. **Advanced Analytics**
   - BigQuery for analytics
   - Data Studio for dashboards

3. **Video Processing**
   - Cloud Video Intelligence API
   - Auto-tagging
   - Content moderation

4. **Notifications**
   - Cloud Pub/Sub
   - Firebase Cloud Messaging
   - Email notifications

5. **Machine Learning**
   - Recommendation engine
   - Content classification
   - Fraud detection

---

**Last Updated**: December 2, 2025
