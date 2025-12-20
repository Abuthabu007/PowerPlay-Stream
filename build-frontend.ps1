#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Build and optionally deploy PowerPlay-Stream Frontend image to Google Cloud
.DESCRIPTION
    Builds the frontend Docker image and pushes it to Google Artifact Registry
.PARAMETER ImageName
    Docker image name (default: powerplay-stream-frontend)
.PARAMETER Version
    Image version tag (default: latest)
.PARAMETER ProjectId
    GCP Project ID (required for pushing to GCP)
.PARAMETER Region
    GCP Region for Artifact Registry (default: us-central1)
.PARAMETER ApiUrl
    Backend API URL for production build (e.g., https://backend-xxxxx.a.run.app/api)
.PARAMETER Push
    Push image to Google Artifact Registry
.PARAMETER Test
    Run health check test after build
#>

param(
    [string]$ImageName = "powerplay-stream-frontend",
    [string]$Version = "latest",
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = "us-central1",
    [string]$RepositoryName,
    [string]$ApiUrl,
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
Write-Host "PowerPlay-Stream Frontend Build" -ForegroundColor Cyan
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

# Check Node/npm for build validation
Write-Host "🔍 Checking npm..." -ForegroundColor Cyan
try {
    npm --version | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Status "✅ npm is available" Success
    }
} catch {
    Write-Status "⚠️  npm not in PATH (Docker will handle it)" Warning
}

# Image configuration
Write-Host ""
Write-Host "📦 Image Configuration:" -ForegroundColor Cyan
Write-Host "   Name: $ImageName"
Write-Host "   Version: $Version"
if ($ApiUrl) {
    Write-Host "   API URL: $ApiUrl"
} else {
    Write-Host "   API URL: Not set (default used)"
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
    
    $buildCmd = "docker build -t $($ImageName):$Version -f Dockerfile --build-arg REACT_APP_API_URL="
    if ($ApiUrl) {
        $buildCmd += "$ApiUrl"
    } else {
        $buildCmd += "http://localhost:5000/api"
    }
    $buildCmd += " ."
    
    Write-Host "   Command: $buildCmd"
    Write-Host "   Working directory: frontend"
    Write-Host "   This may take 2-3 minutes on first build..."
    Write-Host ""
    
    Push-Location frontend
    
    Invoke-Expression $buildCmd
    
    Pop-Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Build failed" Error
        exit 1
    }
    
    Write-Status "✅ Frontend image built successfully" Success
} else {
    Write-Status "⏭️  Skipping build (--NoBuild flag)" Warning
}

# Test the image
if ($Test) {
    Write-Host ""
    Write-Host "🧪 Testing Frontend Image..." -ForegroundColor Cyan
    
    $containerId = docker run -d -p 8080:8080 --name "test-frontend-$$" "$($ImageName):$Version"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Failed to start container" Error
        exit 1
    }
    
    Write-Host "   Container ID: $containerId"
    Write-Host "   Waiting for server to start..."
    Start-Sleep -Seconds 2
    
    # Test health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -ErrorAction Stop -TimeoutSec 5
        Write-Status "✅ Frontend is responding (HTTP $($response.StatusCode))" Success
        Write-Host "   Access at: http://localhost:8080"
    } catch {
        Write-Status "⚠️  Could not reach frontend" Warning
        Write-Host "   Error: $_"
    }
    
    # Cleanup
    Write-Host ""
    Write-Host "Cleaning up test container..."
    docker stop "test-frontend-$$" | Out-Null
    docker rm "test-frontend-$$" | Out-Null
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
    Write-Host "   gcloud run deploy powerplay-frontend ``"
    Write-Host "     --image=$fullImageName ``"
    Write-Host "     --region=$Region ``"
    Write-Host "     --port=8080 ``"
    Write-Host "     --allow-unauthenticated"
    Write-Host ""
}

Write-Host ""
Write-Host "✨ Frontend build complete!" -ForegroundColor Green
Write-Host ""

if ($Push) {
    Write-Host "Next steps:"
    Write-Host "1. Note the image URL above"
    Write-Host "2. Deploy to Cloud Run using the command shown"
    Write-Host "3. Set REACT_APP_API_URL to your backend URL"
    Write-Host ""
}
