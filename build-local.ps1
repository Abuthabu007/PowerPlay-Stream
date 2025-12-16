#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick build script for PowerPlay-Stream monolithic Docker image
.DESCRIPTION
    Builds and optionally tests/pushes the monolithic Docker image
.EXAMPLE
    .\build-local.ps1                    # Build locally
    .\build-local.ps1 -Test              # Build and test
    .\build-local.ps1 -Push -Version v1.0  # Build, test, and push
#>

param(
    [string]$Version = "latest",
    [string]$ImageName = "powerplay-stream",
    [switch]$Test = $false,
    [switch]$Push = $false,
    [switch]$NoBuild = $false,
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = $env:GCP_REGION
)

# Colors for output
$Green = 'Green'
$Blue = 'Blue'
$Red = 'Red'
$Yellow = 'Yellow'

Write-Host "`n================================" -ForegroundColor $Green
Write-Host "PowerPlay-Stream Build Script" -ForegroundColor $Green
Write-Host "================================`n" -ForegroundColor $Green

# Validate Docker
Write-Host "🔍 Checking Docker..." -ForegroundColor $Blue
try {
    docker ps > $null
    Write-Host "✅ Docker is running`n" -ForegroundColor $Green
} catch {
    Write-Error "❌ Docker is not running. Please start Docker Desktop."
    exit 1
}

# Validate frontend build
Write-Host "🔍 Checking frontend build..." -ForegroundColor $Blue
if (-not (Test-Path "frontend/build")) {
    Write-Error "❌ Frontend build not found. Please run: cd frontend && npm run build"
    exit 1
}
Write-Host "✅ Frontend build found`n" -ForegroundColor $Green

# Determine image URI
if ($ProjectId -and $Region) {
    $ImageUri = "$Region-docker.pkg.dev/$ProjectId/powerplay-stream/$ImageName`:$Version"
    $IsGCP = $true
} else {
    $ImageUri = "$ImageName`:$Version"
    $IsGCP = $false
}

Write-Host "📦 Image Configuration:" -ForegroundColor $Blue
Write-Host "   Name: $ImageUri"
Write-Host "   GCP:  $(if ($IsGCP) { 'Yes' } else { 'No' })`n" -ForegroundColor $Blue

# Build image
if (-not $NoBuild) {
    Write-Host "🔨 Building Docker image..." -ForegroundColor $Blue
    Write-Host "   Command: docker build -t $ImageUri -f Dockerfile.monolithic ." -ForegroundColor Gray
    Write-Host "   This may take 3-5 minutes on first build...`n" -ForegroundColor Gray
    
    docker build -t $ImageUri -f Dockerfile.monolithic .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Build failed"
        exit 1
    }
    
    Write-Host "`n✅ Build successful`n" -ForegroundColor $Green
} else {
    Write-Host "⏭️  Skipping build (--NoBuild flag set)`n" -ForegroundColor $Yellow
}

# Show image info
Write-Host "📊 Image Information:" -ForegroundColor $Blue
$ImageInfo = docker images --filter "reference=$ImageUri" --format "table {{.Repository}}:{{.Tag}}`t{{.Size}}`t{{.CreatedAt}}"
Write-Host $ImageInfo
Write-Host ""

# Test image
if ($Test) {
    Write-Host "🧪 Testing image..." -ForegroundColor $Blue
    $ContainerName = "powerplay-test-$(Get-Random)"
    $TestPort = 8080
    
    Write-Host "   Starting container: $ContainerName" -ForegroundColor Gray
    docker run -d `
        -p $TestPort`:8080 `
        -e NODE_ENV=production `
        -e DISABLE_IAP_VALIDATION=true `
        --name $ContainerName `
        $ImageUri > $null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Failed to start container"
        exit 1
    }
    
    Write-Host "   Waiting for startup..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
    
    # Test health endpoint
    Write-Host "   Testing health endpoint..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$TestPort/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Health check passed" -ForegroundColor $Green
            Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
        }
    } catch {
        Write-Error "❌ Health check failed: $_"
    }
    
    # Show logs
    Write-Host "   Container logs:" -ForegroundColor Gray
    docker logs $ContainerName | Select-Object -Last 10 | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
    
    # Cleanup
    Write-Host "   Stopping container..." -ForegroundColor Gray
    docker stop $ContainerName > $null
    docker rm $ContainerName > $null
    
    Write-Host "`n✅ Test complete`n" -ForegroundColor $Green
}

# Push to registry
if ($Push) {
    if (-not $IsGCP) {
        Write-Error "❌ Cannot push without GCP project ID. Set GCP_PROJECT_ID and GCP_REGION environment variables."
        exit 1
    }
    
    Write-Host "📤 Pushing to Artifact Registry..." -ForegroundColor $Blue
    
    # Authenticate
    Write-Host "   Authenticating with Google Cloud..." -ForegroundColor Gray
    gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ GCP authentication failed"
        exit 1
    }
    
    Write-Host "   Pushing image..." -ForegroundColor Gray
    docker push $ImageUri
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Push failed"
        exit 1
    }
    
    Write-Host "`n✅ Push successful`n" -ForegroundColor $Green
}

# Summary
Write-Host "================================" -ForegroundColor $Green
Write-Host "✅ SUCCESS" -ForegroundColor $Green
Write-Host "================================`n" -ForegroundColor $Green

Write-Host "📋 Summary:" -ForegroundColor $Blue
Write-Host "   Image: $ImageUri"
if ($Test) { Write-Host "   Tested: Yes" }
if ($Push) { Write-Host "   Pushed: Yes (Artifact Registry)" }
Write-Host ""

Write-Host "🚀 Next Steps:" -ForegroundColor $Yellow
if ($IsGCP) {
    Write-Host "   1. Deploy to Cloud Run:"
    Write-Host "      gcloud run deploy powerplay-stream --image=$ImageUri --region=$Region --port=8080"
    Write-Host ""
    Write-Host "   2. Or deploy using web console:"
    Write-Host "      https://console.cloud.google.com/run"
} else {
    Write-Host "   1. Run locally:"
    Write-Host "      docker run -p 8080:8080 $ImageUri"
    Write-Host ""
    Write-Host "   2. Visit: http://localhost:8080"
}
Write-Host ""

Write-Host "📖 Documentation:" -ForegroundColor $Yellow
Write-Host "   See: BUILD_MONOLITHIC_IMAGE.md"
Write-Host ""
