# API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: https://YOUR_BACKEND_URL/api
```

## Authentication
All endpoints (except public routes) require IAP token in the Authorization header:
```
Authorization: Bearer YOUR_IAP_TOKEN
```

## Video Endpoints

### Upload Video
**POST** `/videos/upload`

Upload a new video with metadata.

**Request:**
- **Content-Type**: multipart/form-data
- **Fields**:
  - `video` (file, required): Video file
  - `thumbnail` (file, optional): Thumbnail image
  - `title` (string, required): Video title
  - `description` (string, optional): Video description
  - `tags` (string, optional): Comma-separated tags
  - `isPublic` (boolean, optional): Whether video is public (default: true)

**Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Video Title",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "embeddedLink": "https://yourapp.com/embed/uuid",
    "isPublic": true,
    "createdAt": "2025-12-02T10:00:00Z"
  }
}
```

---

### Upload Caption
**POST** `/videos/:videoId/caption`

Upload caption file for a video.

**Request:**
- **Content-Type**: multipart/form-data
- **Parameters**:
  - `videoId` (path, required): Video ID
- **Fields**:
  - `caption` (file, required): Caption file (VTT or SRT format)
  - `language` (string, required): Language code (english, spanish, turkish, arabic, french)
  - `languageCode` (string, required): ISO language code (en, es, tr, ar, fr)

**Response:**
```json
{
  "success": true,
  "message": "Caption uploaded successfully",
  "data": {
    "id": "uuid",
    "videoId": "uuid",
    "language": "english",
    "captionUrl": "https://...",
    "createdAt": "2025-12-02T10:00:00Z"
  }
}
```

---

### Get User's Videos
**GET** `/videos/my-videos`

Get all videos uploaded by the authenticated user.

**Query Parameters:**
- `limit` (number, optional): Results per page (default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Video",
      "description": "...",
      "isPublic": true,
      "viewCount": 42,
      "Captions": [
        {
          "id": "uuid",
          "language": "english",
          "captionUrl": "https://..."
        }
      ]
    }
  ]
}
```

---

### Get Public Videos
**GET** `/videos/public/list`

Get all public videos (no authentication required).

**Query Parameters:**
- `limit` (number, optional): Results per page (default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:** Same as Get User's Videos

---

### Get Single Video
**GET** `/videos/:videoId`

Get details of a specific video.

**Parameters:**
- `videoId` (path, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Video Title",
    "description": "...",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "embeddedLink": "https://...",
    "isPublic": true,
    "isDownloaded": false,
    "viewCount": 100,
    "Captions": [...]
  }
}
```

---

### Toggle Video Privacy
**PATCH** `/videos/:videoId/privacy`

Toggle video between public and private.

**Parameters:**
- `videoId` (path, required): Video ID

**Response:**
```json
{
  "success": true,
  "message": "Video is now public",
  "data": {
    "id": "uuid",
    "isPublic": true
  }
}
```

---

### Mark as Downloaded
**PATCH** `/videos/:videoId/downloaded`

Toggle downloaded status for a video.

**Parameters:**
- `videoId` (path, required): Video ID

**Response:**
```json
{
  "success": true,
  "message": "Video marked as downloaded",
  "data": {
    "id": "uuid",
    "isDownloaded": true
  }
}
```

---

### Get Download URL
**GET** `/videos/:videoId/download`

Get a signed URL for downloading the video.

**Parameters:**
- `videoId` (path, required): Video ID

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.googleapis.com/..."
  }
}
```

---

### Soft Delete Video
**DELETE** `/videos/:videoId`

Remove video from listings (soft delete).

**Parameters:**
- `videoId` (path, required): Video ID

**Response:**
```json
{
  "success": true,
  "message": "Video \"Title\" deleted successfully"
}
```

---

### Permanent Delete Video
**DELETE** `/videos/:videoId/permanent`

Permanently delete video from storage and database (superadmin only).

**Parameters:**
- `videoId` (path, required): Video ID

**Authorization:** Requires superadmin role

**Response:**
```json
{
  "success": true,
  "message": "Video \"Title\" permanently deleted"
}
```

---

## Search Endpoints

### Get Suggestions
**GET** `/search/suggestions`

Get search suggestions with auto-complete.

**Query Parameters:**
- `query` (string, required): Search query

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Video Title",
      "description": "..."
    }
  ]
}
```

---

### Semantic Search
**GET** `/search/semantic`

Perform semantic search using Vertex AI.

**Query Parameters:**
- `query` (string, required): Search query

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Video Title",
      "description": "...",
      "tags": ["tag1", "tag2"],
      "viewCount": 50
    }
  ]
}
```

---

### Find Similar Videos
**GET** `/search/:videoId/similar`

Find videos similar to the specified video.

**Parameters:**
- `videoId` (path, required): Video ID to find similar videos for

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Similar Video",
      "description": "...",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Video file is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized: Missing IAP token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Forbidden: Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Video not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "statusCode": 500,
  "message": "Internal Server Error",
  "stack": "..." // Only in development
}
```

---

## Rate Limiting

Currently not implemented. Consider adding for production:
- 100 requests per minute per user
- 1000 requests per hour per IP

---

## Versioning

Current API version: **v1.0.0**

Future versions may be available at:
- `/api/v2/...`

---

## Examples

### Example: Upload and Search Video

```bash
# 1. Upload video
curl -X POST http://localhost:5000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=My Tutorial" \
  -F "description=Learn how to code" \
  -F "tags=education,tutorial,programming" \
  -F "isPublic=true" \
  -F "video=@video.mp4" \
  -F "thumbnail=@thumbnail.jpg"

# 2. Upload caption
curl -X POST http://localhost:5000/api/videos/{videoId}/caption \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "caption=@captions.vtt" \
  -F "language=english" \
  -F "languageCode=en"

# 3. Search for video
curl "http://localhost:5000/api/search/suggestions?query=tutorial" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Get video details
curl http://localhost:5000/api/videos/{videoId} \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Toggle privacy
curl -X PATCH http://localhost:5000/api/videos/{videoId}/privacy \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Last Updated**: December 2, 2025
