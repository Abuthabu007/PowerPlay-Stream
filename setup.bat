@echo off
REM PowerPlay Stream - Quick Start Script for Windows
REM This script sets up and runs the application locally

echo.
echo 🎬 PowerPlay Stream - Local Development Setup
echo =============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed or not in PATH
    exit /b 1
)

echo [OK] Node.js and npm found
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend setup failed
    exit /b 1
)
cd ..
echo [OK] Backend dependencies installed
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend setup failed
    exit /b 1
)
cd ..
echo [OK] Frontend dependencies installed
echo.

REM Create .env file if it doesn't exist
if not exist "backend\.env" (
    echo Creating .env file...
    copy "backend\.env.example" "backend\.env"
    echo [OK] .env file created
    echo [WARNING] Please update backend\.env with your GCP credentials
    echo.
)

echo Setup complete!
echo.
echo To start the application:
echo.
echo Option 1: Using Docker Compose (recommended)
echo   docker-compose up
echo.
echo Option 2: Manual startup
echo   Terminal 1: cd backend ^&^& npm run dev
echo   Terminal 2: cd frontend ^&^& npm start
echo.
echo Frontend will be available at: http://localhost:3000
echo Backend API at: http://localhost:5000
echo.
pause
