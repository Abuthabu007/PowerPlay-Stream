#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Build and optionally deploy PowerPlay-Stream Backend image to Google Cloud
.DESCRIPTION
    Builds the backend Docker image and pushes it to Google Artifact Registry
.PARAMETER ImageName
    Docker image name (default: powerplay-stream-backend)
.PARAMETER Version
    Image version tag (default: latest)
.PARAMETER ProjectId
    GCP Project ID (required for pushing to GCP)
.PARAMETER Region
    GCP Region for Artifact Registry (default: us-central1)
.PARAMETER FrontendUrl
    Frontend URL for CORS configuration (e.g., https://frontend-xxxxx.a.run.app)
.PARAMETER Push
    Push image to Google Artifact Registry
.PARAMETER Test
    Run health check test after build
#>

param(
    [string]$ImageName = "powerplay-stream-backend",
    [string]$Version = "latest",
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = "us-central1",
    [string]$RepositoryName,
    [string]$FrontendUrl,
    [switch]$Push,
    [switch]$Test,
    [switch]$NoBuild
)

# Colors for output
$Colors = @{
    Success = 'Green'
    Error = 'Red'
    Warning = 'Yellow'
    Info = 'Cyan'
}

function Write-Status {
    param([string]$Message, [string]$Type = 'Info')
    $color = if ($Colors.ContainsKey($Type)) { $Colors[$Type] } else { 'White' }
    Write-Host $Message -ForegroundColor $color
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "PowerPlay-Stream Backend Build" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "🔍 Checking Docker..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✅ Docker is running" Success
    }
} catch {
    Write-Status "❌ Docker is not available" Error
    exit 1
}

# Check backend source
Write-Host "🔍 Checking backend files..." -ForegroundColor Cyan
if (Test-Path "backend/package.json") {
    Write-Status "✅ Backend source found" Success
} else {
    Write-Status "❌ backend/package.json not found" Error
    exit 1
}

# Image configuration
Write-Host ""
Write-Host "📦 Image Configuration:" -ForegroundColor Cyan
Write-Host "   Name: $ImageName"
Write-Host "   Version: $Version"
if ($FrontendUrl) {
    Write-Host "   Frontend URL: $FrontendUrl"
} else {
    Write-Host "   Frontend URL: Not set (CORS to localhost)"
}
if ($Push) {
    Write-Host "   GCP: Yes - $ProjectId/$Region"
} else {
    Write-Host "   GCP: No"
}
Write-Host ""

# Build the image
if (-not $NoBuild) {
    Write-Host "🔨 Building Docker image..." -ForegroundColor Cyan
    Write-Host "   Working directory: backend"
    Write-Host "   Command: docker build -t $($ImageName):$Version -f Dockerfile ."
    Write-Host "   This may take 2-3 minutes on first build..."
    Write-Host ""
    
    Push-Location backend
    
    docker build -t "$($ImageName):$Version" -f Dockerfile .
    
    Pop-Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Build failed" Error
        exit 1
    }
    
    Write-Status "✅ Backend image built successfully" Success
} else {
    Write-Status "⏭️  Skipping build (--NoBuild flag)" Warning
}

# Test the image
if ($Test) {
    Write-Host ""
    Write-Host "🧪 Testing Backend Image..." -ForegroundColor Cyan
    
    $envArgs = ""
    if ($FrontendUrl) {
        $envArgs = "-e FRONTEND_URL=$FrontendUrl"
    }
    
    $containerId = docker run -d -p 5000:5000 `
        -e NODE_ENV=development `
        -e DISABLE_IAP_VALIDATION=true `
        $envArgs `
        --name "test-backend-$$" `
        "$($ImageName):$Version"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Failed to start container" Error
        exit 1
    }
    
    Write-Host "   Container ID: $containerId"
    Write-Host "   Waiting for server to start..."
    Start-Sleep -Seconds 3
    
    # Test health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -ErrorAction Stop -TimeoutSec 5
        Write-Status "✅ Backend is responding (HTTP $($response.StatusCode))" Success
        Write-Host "   Health check: $($response.Content)"
    } catch {
        Write-Status "⚠️  Could not reach backend health endpoint" Warning
        Write-Host "   Error: $_"
    }
    
    # Show logs
    Write-Host ""
    Write-Host "   Recent logs:"
    docker logs --tail 10 "test-backend-$$" | ForEach-Object { Write-Host "   $_" }
    
    # Cleanup
    Write-Host ""
    Write-Host "   Cleaning up test container..."
    docker stop "test-backend-$$" | Out-Null
    docker rm "test-backend-$$" | Out-Null
    Write-Status "✅ Test complete" Success
}

# Push to Google Cloud
if ($Push) {
    Write-Host ""
    Write-Host "📤 Pushing to Google Cloud..." -ForegroundColor Cyan
    
    if (-not $ProjectId) {
        Write-Status "❌ ProjectId is required for pushing" Error
        Write-Host "   Set GCP_PROJECT_ID environment variable or use -ProjectId parameter"
        exit 1
    }
    
    if (-not $RepositoryName) {
        Write-Status "❌ RepositoryName is required for pushing" Error
        Write-Host "   Use -RepositoryName parameter (e.g., looply-docker-repo)"
        exit 1
    }
    
    $registryUrl = "$Region-docker.pkg.dev/$ProjectId/$RepositoryName"
    $fullImageName = "$registryUrl/$($ImageName):$Version"
    
    Write-Host "   Registry: $registryUrl"
    Write-Host "   Full image: $fullImageName"
    
    # Authenticate with Google Cloud
    Write-Host ""
    Write-Host "   Authenticating with Google Cloud..."
    gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Failed to authenticate with Google Cloud" Error
        exit 1
    }
    
    # Tag image
    Write-Host "   Tagging image..."
    docker tag "$($ImageName):$Version" "$fullImageName"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Failed to tag image" Error
        exit 1
    }
    
    # Push image
    Write-Host "   Pushing image (this may take a few minutes)..."
    docker push "$fullImageName"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Failed to push image" Error
        exit 1
    }
    
    Write-Status "✅ Image pushed successfully" Success
    Write-Host ""
    Write-Host "   🚀 Deploy to Cloud Run:"
    Write-Host ""
    Write-Host "   gcloud run deploy powerplay-backend ``"
    Write-Host "     --image=$fullImageName ``"
    Write-Host "     --region=$Region ``"
    Write-Host "     --port=5000 ``"
    Write-Host "     --allow-unauthenticated"
    Write-Host ""
}

Write-Host ""
Write-Host "✨ Backend build complete!" -ForegroundColor Green
Write-Host ""

if ($Push) {
    Write-Host "Next steps:"
    Write-Host "1. Note the image URL above"
    Write-Host "2. Deploy to Cloud Run using the command shown"
    Write-Host "3. Set FRONTEND_URL to your frontend service URL in Cloud Run"
    Write-Host ""
}
