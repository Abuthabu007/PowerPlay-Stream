# Copilot Instructions for PowerPlay-Stream

## Architecture Overview

### High-level Components
- **Frontend:** React app in `frontend/src/` with components (`components/`), pages (`pages/`), and styles. Builds to `frontend/build/` for production.
- **Backend:** Node.js/Express service in `backend/src/` with MVC-style structure:
  - `controllers/` - Request handlers (e.g., `videoController.js`, `searchController.js`)
  - `services/` - Business logic and external API calls (e.g., `videoService.js`, `vertexAiService.js`, `storageService.js`)
  - `models/` - Data models (e.g., `Video.js`, `User.js`, `Caption.js`)
  - `routes/` - API route definitions
  - `middleware/` - Auth, error handling (see `auth.js`, `errorHandler.js`)
  - `config/` - External service configuration (database, Cloud Storage, Pub/Sub, Vertex AI)

### Data Flows
1. **Upload Flow:** Client → `frontend/src/components/UploadDialog.jsx` → `/api/videos` POST → `backend/controllers/videoController.js` → `backend/services/videoService.js` → Cloud Storage + local `uploads/` directory
2. **Search/Processing:** `frontend/src/components/SearchBar.jsx` → `/api/search` → `backend/controllers/searchController.js` → `backend/services/vertexAiService.js` → Vertex AI API → returns analyzed captions

### External Integrations
- **Google Cloud IAP:** Token validation in `backend/src/middleware/auth.js` (can be disabled locally)
- **Cloud Storage:** File persistence via `backend/src/config/storage.js` and `backend/services/storageService.js`
- **Pub/Sub:** Message queue configured in `backend/src/config/pubsub.js`
- **Vertex AI:** NLP/caption analysis via `backend/src/config/vertexai.js` and `backend/services/vertexAiService.js`

## Local Development Setup

### Quick Start (Node only)
```powershell
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm start
```

### Docker Compose (Recommended)
```powershell
docker-compose up --build
```

### Disabling IAP Validation (Local Development)
Set the environment variable before starting the backend:
```powershell
$env:DISABLE_IAP_VALIDATION='true'
npm start
```

The middleware in `backend/src/middleware/auth.js` will log a warning and mock a development user when this flag is set. **Never use this in production.**

### Frontend Build
```powershell
cd frontend
npm run build  # Output: frontend/build/
```

## Project Conventions & Patterns

1. **Service Layer Pattern:** Business logic is isolated in `backend/services/*`. Controllers delegate to services; services call external APIs and handle errors.
2. **Error Handling:** Centralized middleware at `backend/src/middleware/errorHandler.js`. All errors should propagate through the Express pipeline.
3. **Configuration:** Environment variables are loaded via `dotenv` in `backend/src/index.js` and individual config files (e.g., `backend/src/config/database.js`).
4. **Middleware Stack:** Auth and error handlers are applied in `backend/src/index.js`. Protect routes by wrapping with `iapAuth` middleware from `backend/src/middleware/auth.js`.
5. **Frontend Components:** Each component lives in `frontend/src/components/` with a corresponding CSS file (e.g., `VideoCard.jsx` and `VideoCard.css`).

## Critical Files for AI Agents

### To Understand Auth
- `backend/src/middleware/auth.js` - IAP token validation and DISABLE_IAP_VALIDATION flag
- `backend/src/index.js` - Middleware stack initialization

### To Understand Data Flow
- `backend/src/routes/videoRoutes.js` - Video API routes
- `backend/src/controllers/videoController.js` - Video request handlers
- `backend/src/services/videoService.js` - Video business logic

### To Understand Search/Analysis
- `backend/src/routes/searchRoutes.js` - Search API routes
- `backend/src/controllers/searchController.js` - Search request handlers
- `backend/src/services/vertexAiService.js` - Vertex AI integration

### To Understand UI
- `frontend/src/components/UploadDialog.jsx` - File upload interface
- `frontend/src/components/SearchBar.jsx` - Search interface
- `frontend/src/App.jsx` - Root component and routing

## Integration Gotchas

1. **IAP Headers:** In production, IAP adds an `Authorization: Bearer <JWT>` header. Locally, set `DISABLE_IAP_VALIDATION=true` to skip token validation.
2. **Storage Paths:** Backend writes to local `uploads/` directory during development. Ensure the directory exists and is writable.
3. **Vertex AI Credentials:** Service requires Google Cloud credentials (GOOGLE_APPLICATION_CREDENTIALS). Check `backend/src/config/vertexai.js` and `backend/src/config/storage.js`.
4. **CORS:** Frontend runs on `localhost:3000` (dev) or served from `frontend/build/` in production. CORS is enabled in `backend/src/index.js`.

## AI Agent Guidelines

- **Use GPT-5 mini** for all coding suggestions and PR descriptions.
- **When modifying auth:** do not remove IAP checks. Add toggles (like `DISABLE_IAP_VALIDATION`) instead.
- **Keep edits focused:** one logical change per commit/PR. For example, if adding a feature flag, update only the relevant middleware and config files.
- **Reference key files in PRs:** cite specific files (e.g., `backend/src/middleware/auth.js`) to help reviewers understand changes.
- **Test locally first:** use `DISABLE_IAP_VALIDATION=true` to test auth-protected endpoints without real IAP tokens.
