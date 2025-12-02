# Multi-stage build: Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# Multi-stage build: Backend + Frontend serving
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/src ./src

# Copy built frontend from builder stage
COPY --from=frontend-builder /frontend/build ./public

# Set environment
ENV NODE_ENV=production
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "src/index.js"]
