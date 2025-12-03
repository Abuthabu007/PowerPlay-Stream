#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build and push PowerPlay-Stream monolithic Docker image
.EXAMPLE
    .\build-monolithic.ps1
    .\build-monolithic.ps1 -Version "v1.0"
#>

param(
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = $env:GCP_REGION,
    [string]$Version = "latest"
)

if (-not $ProjectId) { Write-Error "GCP_PROJECT_ID not set"; exit 1 }
if (-not $Region) { $Region = "us-central1" }

$ImageUri = "$Region-docker.pkg.dev/$ProjectId/powerplay-stream/app:$Version"

Write-Host ""
Write-Host "Building PowerPlay-Stream (Monolithic)" -ForegroundColor Green
Write-Host "Image: $ImageUri" -ForegroundColor Cyan
Write-Host ""

# Check Docker
try { docker ps > $null } catch { Write-Error "Docker not running"; exit 1 }

# Authenticate
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet 2>$null

# Build
Write-Host "Building image..." -ForegroundColor Blue
docker build -t $ImageUri -f Dockerfile.monolithic .
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

# Push
Write-Host "Pushing to Artifact Registry..." -ForegroundColor Blue
docker push $ImageUri
if ($LASTEXITCODE -ne 0) { Write-Error "Push failed"; exit 1 }

Write-Host ""
Write-Host "✅ SUCCESS" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Deploy to Cloud Run" -ForegroundColor Yellow
Write-Host "Image URI: $ImageUri" -ForegroundColor Cyan
Write-Host ""
Write-Host "Steps:" -ForegroundColor Gray
Write-Host "1. Open: https://console.cloud.google.com/run" -ForegroundColor Gray
Write-Host "2. Create Service → Select Container Image" -ForegroundColor Gray
Write-Host "3. Paste URI above" -ForegroundColor Gray
Write-Host "4. Configure: Port 8080, Memory 512Mi" -ForegroundColor Gray
Write-Host "5. Deploy" -ForegroundColor Gray
Write-Host ""
