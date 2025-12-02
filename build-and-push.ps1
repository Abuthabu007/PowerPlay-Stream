#!/usr/bin/env pwsh
# PowerPlay Stream - Cloud Run Build Script
# This script builds and pushes Docker images to Google Artifact Registry

param(
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = "us-central1",
    [string]$Version = "latest"
)

if (-not $ProjectId) {
    Write-Error "GCP_PROJECT_ID environment variable not set. Please set it or provide -ProjectId parameter."
    exit 1
}

$ImageRegistry = "$Region-docker.pkg.dev/$ProjectId/powerplay-stream"
$BackendImage = "$ImageRegistry/backend:$Version"
$FrontendImage = "$ImageRegistry/frontend:$Version"

Write-Host "=== PowerPlay Stream Cloud Run Build ===" -ForegroundColor Green
Write-Host "Project ID: $ProjectId"
Write-Host "Region: $Region"
Write-Host "Version: $Version"
Write-Host ""

# Step 1: Build Backend
Write-Host "Step 1: Building backend image..." -ForegroundColor Blue
Push-Location backend
docker build -t $BackendImage .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend build failed"
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✓ Backend image built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Build Frontend
Write-Host "Step 2: Building frontend image..." -ForegroundColor Blue
Push-Location frontend
docker build -t $FrontendImage .
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed"
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "✓ Frontend image built successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Push to Artifact Registry
Write-Host "Step 3: Pushing images to Artifact Registry..." -ForegroundColor Blue

Write-Host "  Pushing backend..."
docker push $BackendImage
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend push failed"
    exit 1
}
Write-Host "  ✓ Backend pushed"

Write-Host "  Pushing frontend..."
docker push $FrontendImage
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend push failed"
    exit 1
}
Write-Host "  ✓ Frontend pushed"
Write-Host ""

# Summary
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host "Backend:  $BackendImage"
Write-Host "Frontend: $FrontendImage"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Run: gcloud run deploy powerplay-stream-backend --image $BackendImage --region $Region"
Write-Host "2. Run: gcloud run deploy powerplay-stream-frontend --image $FrontendImage --region $Region"
Write-Host ""
Write-Host "Or use the full CLOUD_RUN_DEPLOYMENT.md guide for complete setup."
