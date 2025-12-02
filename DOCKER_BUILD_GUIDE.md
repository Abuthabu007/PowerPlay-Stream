# Docker Build Instructions - Two Options

## Option 1: Install Docker Desktop (Recommended)

### Prerequisites
- Windows 10 Pro/Enterprise or Windows 11 (Home, Pro, etc.)
- Hyper-V enabled (usually enabled by default)
- At least 4GB RAM
- Administrator access

### Installation Steps
1. **Download Docker Desktop**
   - Go to: https://www.docker.com/products/docker-desktop
   - Click "Download for Windows"
   - Save the installer

2. **Install Docker Desktop**
   - Right-click the installer
   - Select "Run as Administrator"
   - Follow the installation wizard
   - Restart your computer when prompted

3. **Verify Installation**
   ```powershell
   docker --version
   docker run hello-world
   ```

4. **Build Docker Images**
   ```powershell
   # Build backend image
   docker build -t powerplay-backend:latest ./backend

   # Build frontend image
   docker build -t powerplay-frontend:latest ./frontend
   ```

---

## Option 2: Use Google Cloud Build (No Local Docker Needed)

This option builds Docker images in the cloud instead of locally.

### Prerequisites
- GCP account (you already have this!)
- gcloud CLI (you have this!)
- Authenticated with GCP

### Steps
1. **Push code to GitHub** (optional but recommended)
   ```powershell
   git init
   git add .
   git commit -m "Ready for cloud build"
   git remote add origin https://github.com/YourUsername/PowerPlay-Stream.git
   git push -u origin main
   ```

2. **Build in Cloud using gcloud**
   ```powershell
   # Build backend
   gcloud builds submit --config cloudbuild-backend.yaml

   # Build frontend
   gcloud builds submit --config cloudbuild-frontend.yaml
   ```

---

## Option 3: Build Using WSL 2 (Windows Subsystem for Linux)

If Docker Desktop installation fails, you can use WSL 2:

1. **Install WSL 2**
   ```powershell
   wsl --install
   ```

2. **Install Docker in WSL**
   ```bash
   sudo apt-get update
   sudo apt-get install docker.io
   ```

3. **Build images**
   ```bash
   docker build -t powerplay-backend:latest ./backend
   docker build -t powerplay-frontend:latest ./frontend
   ```

---

## Quick Build Commands (Once Docker is Installed)

```powershell
# Navigate to project root
cd d:\GCP-Project\PowerPlayapp\PowerPlay-Stream\PowerPlay-Stream

# Build backend image
docker build -t powerplay-backend:v1.0 ./backend
docker build -t gcr.io/komo-infra-479911/powerplay-backend:latest ./backend

# Build frontend image
docker build -t powerplay-frontend:v1.0 ./frontend
docker build -t gcr.io/komo-infra-479911/powerplay-frontend:latest ./frontend

# Verify images
docker images

# Test backend image
docker run -p 5000:5000 powerplay-backend:v1.0

# Test frontend image
docker run -p 3000:3000 powerplay-frontend:v1.0
```

---

## Recommended Next Steps

1. **Install Docker Desktop** (Option 1 - Easiest)
2. **Run the build commands above**
3. **Test the images locally**
4. **Then deploy to Cloud Run using the deployment script**

---

## Already Have Docker Installed?

If Docker is installed but not recognized in PowerShell:

1. **Restart PowerShell as Administrator**
2. **Or restart your computer**
3. **Or add Docker to PATH:**
   ```powershell
   # Check if Docker is in PATH
   Get-Command docker
   
   # If not found, add it manually
   $env:PATH += ";C:\Program Files\Docker\Docker\resources\bin"
   ```

---

## Need Help?

- **Docker Installation**: https://docs.docker.com/desktop/install/windows-install/
- **Docker Basics**: https://docs.docker.com/get-started/
- **Troubleshooting**: https://docs.docker.com/desktop/troubleshoot/

Feel free to ask if you need help with any of these options!
