# Firestore Migration Guide

## ✅ What's Been Changed

Your application has been **fully migrated from SQL (PostgreSQL/MySQL/SQLite) to Google Cloud Firestore**.

### Removed Dependencies
- ❌ `sequelize` - ORM for SQL databases
- ❌ `mysql2` - MySQL driver
- ❌ `pg` - PostgreSQL driver
- ❌ `pg-hstore` - PostgreSQL utilities
- ❌ `sqlite3` - SQLite driver

### Added Dependencies
- ✅ `firebase-admin` (^12.0.0) - Firebase Admin SDK
- ✅ `@google-cloud/firestore` (^7.5.0) - Firestore client

---

## 📋 Files Modified

### Configuration
- **`backend/src/config/database.js`**
  - Replaced Sequelize initialization with Firebase Admin SDK
  - Initializes Firestore instance
  - Supports both service account file and default credentials

### Models (Converted to Firestore)
- **`backend/src/models/User.js`**
  - Collection: `users`
  - Document-based instead of SQL table
  - Methods: create, findByPk, findOne, update, destroy, findAll

- **`backend/src/models/Video.js`**
  - Collection: `videos`
  - Document-based structure
  - Methods: create, findByPk, findAll, search, update, softDelete, findByUserId, incrementViewCount

- **`backend/src/models/Caption.js`**
  - Collection: `captions`
  - Document-based structure
  - Methods: create, findByPk, findAll, findByVideoAndLanguage, update, destroy

### Services (Updated for Firestore)
- **`backend/src/services/userService.js`**
  - Updated to use Firestore User model
  - Removed `.where()` syntax, now passes objects directly
  - Added deactivateUser method

- **`backend/src/services/videoService.js`**
  - Implemented all TODO methods for Firestore
  - Updated search, CRUD, and lifecycle operations
  - Proper authorization checks

- **`backend/src/services/vertexAiService.js`**
  - Removed Sequelize `Op` operators
  - Updated to use Firestore Video.search()
  - Simplified similarity matching logic

---

## 🗂️ Firestore Collection Structure

### `users` Collection
```javascript
{
  id: "uuid-string",
  email: "user@example.com",
  name: "User Name",
  iapId: "iap-identity-string",
  role: "user" | "admin" | "superadmin",
  isActive: true | false,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `videos` Collection
```javascript
{
  id: "uuid-string",
  userId: "user-uuid",  // Reference to users collection
  title: "Video Title",
  description: "Description",
  tags: ["tag1", "tag2"],
  thumbnailUrl: "https://...",
  videoUrl: "https://...",
  duration: 3600,  // seconds
  fileSize: 1024000,  // bytes
  cloudStoragePath: "gs://bucket/path/video.mp4",
  folderPath: "user-id/video-id",
  isPublic: true | false,
  isDownloaded: true | false,
  isDeleted: false,
  deletedAt: null | Timestamp,
  viewCount: 0,
  embeddedLink: "https://...",
  transcodingStatus: "pending" | "processing" | "completed" | "failed",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `captions` Collection
```javascript
{
  id: "uuid-string",
  videoId: "video-uuid",  // Reference to videos collection
  language: "english" | "spanish" | "turkish" | "arabic" | "french",
  languageCode: "en" | "es" | "tr" | "ar" | "fr",
  captionUrl: "https://...",
  cloudStoragePath: "gs://bucket/path/caption.vtt",
  fileSize: 5000,  // bytes
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install the new Firebase Admin SDK packages.

### 2. Configure Firebase Credentials

**Option A: Using Service Account File (Recommended for production)**

```bash
# Download your service account key from Google Cloud Console:
# GCP Console → Project → Service Accounts → Create Key → JSON

# Place the file in the backend directory:
cp /path/to/serviceAccountKey.json ./backend/

# Or set environment variable:
export FIREBASE_SERVICE_ACCOUNT="./serviceAccountKey.json"
```

**Option B: Using Default Credentials (For local development)**

```bash
# Set Google Cloud credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
export GCP_PROJECT_ID="your-project-id"
```

### 3. Set Environment Variables

```bash
# .env file or system environment
NODE_ENV=production
PORT=8080
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

### 4. Test Firestore Connection

```bash
# Start the backend
npm run dev

# You should see in logs:
# "Firestore initialized for project: your-project-id"
```

---

## 📊 Query Patterns

### Before (Sequelize/SQL)
```javascript
const users = await User.findAll({
  where: { role: 'admin' },
  limit: 10,
  order: [['createdAt', 'DESC']]
});
```

### After (Firestore)
```javascript
const users = await User.findAll({
  where: { role: 'admin' },
  limit: 10
});
```

**Key Differences:**
- No `.where()` wrapper - pass object directly
- No `order` parameter - implement sorting in application code
- No `raw: true` option - all documents return as objects
- Firestore automatically handles timestamps

---

## 🔍 Firestore Query Capabilities

### Supported Operations

| Operation | Example | Notes |
|-----------|---------|-------|
| **Equality** | `where: { role: 'admin' }` | Exact match |
| **Array Contains** | `tags: ['keyword']` | For array fields |
| **Compound Queries** | Multiple where clauses | AND logic only |
| **Limit** | `limit: 10` | Maximum results |
| **Soft Delete** | `isDeleted: false` | Filter deleted items |

### Search Implementation

**Metadata-Based Search** (Simple & Fast)
- Searches on title, description, and tags
- Client-side filtering and relevance scoring
- No Vertex AI needed
- Instant results with Firestore metadata

```javascript
// Example: Search for "tutorial"
const results = await searchService.search("tutorial", limit: 10);

// Scoring priority:
// 1. Title match (10 points, +5 if starts with term)
// 2. Description match (5 points)
// 3. Tag match (3 points each)
// 4. Sorted by score, then by popularity (view count)
```

---

## 🚀 Setup Instructions
The code doesn't use Firestore transactions. If you need atomic multi-document updates:
```javascript
const batch = db.batch();
batch.update(doc1, data);
batch.update(doc2, data);
await batch.commit();
```

### 3. Incremental Updates
The code uses `.update()` for partial updates. For counter operations:
```javascript
// Increment view count
viewCount: db.FieldValue.increment(1)
```

### 4. Cost Implications
- Firestore charges per read/write/delete operation
- Index creation may auto-generate for some queries
- Deletes cost the same as writes
- Reads are $0.06 per 100K reads (after free tier)

---

## 🧪 Testing Your Migration

### Manual Testing
```bash
# Start backend
npm run dev

# Test health endpoint
curl http://localhost:8080/health

# Create test user (via API)
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Check Firestore Console
# GCP Console → Firestore → Collections → Should see "users" collection
```

### Backend Tests
```bash
# Run test suite
npm run test
```

---

## 🔄 Migration Rollback

If you need to revert to SQL:
1. `git checkout backend/package.json` (restore SQL dependencies)
2. `git checkout backend/src/config/database.js` (restore Sequelize config)
3. `git checkout backend/src/models/` (restore Sequelize models)
4. `npm install` (reinstall SQL packages)

---

## 📱 Frontend Changes

**No changes needed!** The frontend still communicates via the same API endpoints:
- `/api/videos` - Video operations
- `/api/search` - Search functionality  
- `/api/users` - User management
- `/health` - Health check

All API contracts remain identical.

---

## 🐛 Troubleshooting

### "Error: Failed to initialize Firebase"
**Solution:** Ensure `GCP_PROJECT_ID` and credentials are set:
```bash
export GCP_PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

### "Firestore: permission denied"
**Solution:** Check Firestore security rules in Cloud Console:
```javascript
// Permissive rules for development (REMOVE in production):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### "Cannot find module 'firebase-admin'"
**Solution:** Reinstall dependencies:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### "video.save() is not a function"
**This is expected!** Models no longer have `.save()` method:
```javascript
// OLD (Sequelize)
video.title = "New Title";
await video.save();

// NEW (Firestore)
await Video.update({ title: "New Title" }, { where: { id: videoId } });
```

---

## 📈 Performance Optimization

### Enable Firestore Caching
```javascript
// In database.js (already configured for development)
db.settings({ 
  experimentalForceLongPolling: true 
});
```

### Compound Index for Complex Queries
If you query multiple fields:
```javascript
// GCP Console will suggest indexes automatically
// Firestore will create them when needed
```

### Batch Operations
```javascript
const batch = db.batch();

for (let i = 0; i < videos.length; i++) {
  batch.update(db.collection('videos').doc(videos[i].id), { viewCount: i });
}

await batch.commit();  // Single operation
```

---

## 📚 Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

## ✅ Migration Checklist

- [x] Removed all SQL dependencies
- [x] Added Firebase Admin SDK
- [x] Converted database config to Firestore
- [x] Converted User model to Firestore
- [x] Converted Video model to Firestore
- [x] Converted Caption model to Firestore
- [x] Updated UserService for Firestore
- [x] Updated VideoService for Firestore
- [x] Updated VertexAiService for Firestore
- [ ] **Next:** Test the application locally
- [ ] **Next:** Deploy to Cloud Run
- [ ] **Next:** Monitor Firestore usage in Cloud Console

---

**Status:** ✅ Migration Complete - Ready for Testing and Deployment
