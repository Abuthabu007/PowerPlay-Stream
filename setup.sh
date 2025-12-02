#!/bin/bash

# PowerPlay Stream - Quick Start Script
# This script sets up and runs the application locally

set -e

echo "🎬 PowerPlay Stream - Local Development Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js and npm found${NC}"

# Install backend dependencies
echo -e "\n${YELLOW}Installing backend dependencies...${NC}"
cd backend
npm install
cd ..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Install frontend dependencies
echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo -e "\n${YELLOW}Creating .env file...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}Please update backend/.env with your GCP credentials${NC}"
fi

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}To start the application:${NC}"
echo ""
echo "Option 1: Using Docker Compose (recommended)"
echo "  docker-compose up"
echo ""
echo "Option 2: Manual startup"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm start"
echo ""
echo "Frontend will be available at: http://localhost:3000"
echo "Backend API at: http://localhost:5000"
