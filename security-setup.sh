#!/bin/bash
# Security Setup Quick Start Guide

echo "================================"
echo "PowerPlay-Stream Security Setup"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Please install Node.js first."
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not installed"
    exit 1
fi
echo "✅ npm $(npm --version)"

echo ""
echo "Step 1: Installing dependencies..."
cd backend
npm install
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
cd ..

echo ""
echo "Step 2: Choose security scanning backend"
echo ""
echo "Option A: VirusTotal API (Recommended for Cloud)"
echo "  - Free tier: 4 req/min, 500 req/day"
echo "  - Get key: https://www.virustotal.com/gui/my-apikey"
echo ""
echo "Option B: ClamAV (Recommended for Servers)"
echo "  - Free, open-source, no rate limits"
echo "  - Setup: docker run -d -p 3310:3310 clamav/clamav"
echo ""
echo "Option C: Heuristic Only (Development)"
echo "  - Fast, no dependencies"
echo "  - Limited detection capability"
echo ""

read -p "Choose option (A/B/C) [default: C]: " choice
choice=${choice:-C}

echo ""
echo "Step 3: Configuring environment..."

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from template"
fi

case $choice in
    A)
        echo ""
        read -p "Enter your VirusTotal API key: " vt_key
        if [ -z "$vt_key" ]; then
            echo "⚠️  VirusTotal API key not set. Using heuristic mode."
        else
            # Update .env (cross-platform safe way)
            sed -i.bak "s/^VIRUSTOTAL_API_KEY=.*/VIRUSTOTAL_API_KEY=$vt_key/" backend/.env
            echo "✅ VirusTotal API key configured"
        fi
        ;;
    B)
        echo ""
        echo "Starting ClamAV daemon..."
        
        if command -v docker &> /dev/null; then
            docker ps | grep -q clamav
            if [ $? -ne 0 ]; then
                docker run -d --name clamav -p 3310:3310 clamav/clamav
                echo "✅ ClamAV started in Docker"
                echo "⏳ Waiting for ClamAV to initialize (this may take 1-2 minutes)..."
                sleep 30
            else
                echo "✅ ClamAV already running"
            fi
        else
            echo "ℹ️  Docker not found. Install ClamAV manually:"
            echo "   Linux: sudo apt-get install clamav clamav-daemon"
            echo "   macOS: brew install clamav"
            echo "   Windows: Download from https://www.clamav.net/"
        fi
        
        # Update .env
        sed -i.bak 's/^CLAMAV_HOST=.*/CLAMAV_HOST=localhost/' backend/.env
        sed -i.bak 's/^CLAMAV_PORT=.*/CLAMAV_PORT=3310/' backend/.env
        echo "✅ ClamAV configured"
        ;;
    C)
        echo "✅ Using heuristic scanning (development mode)"
        ;;
    *)
        echo "❌ Invalid option. Using heuristic mode."
        ;;
esac

echo ""
echo "Step 4: Verifying configuration..."

# Check .env file
if grep -q "VIRUSTOTAL_API_KEY" backend/.env; then
    echo "✅ Security environment variables configured"
else
    echo "⚠️  Review backend/.env to configure security settings"
fi

echo ""
echo "================================"
echo "✅ Security setup complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Start the backend:"
echo "   cd backend && npm start"
echo ""
echo "2. Test security with:"
echo "   - Valid video: curl -X POST http://localhost:5000/api/videos/upload \\"
echo "     -F 'video=@test.mp4'"
echo ""
echo "3. Read full documentation:"
echo "   cat SECURITY_IMPLEMENTATION.md"
echo ""
echo "For Cloud Run deployment:"
echo "   See SECURITY_IMPLEMENTATION.md - Deployment section"
echo ""
