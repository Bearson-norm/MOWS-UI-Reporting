@echo off
REM MO Receiver - Setup Script for Windows
REM This script will help you set up the MO Receiver Website

echo ==========================================
echo   MO Receiver - Automated Setup Script  
echo ==========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js %NODE_VERSION% is installed
echo.

REM Check if npm is installed
echo Checking npm installation...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo npm is not installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo npm %NPM_VERSION% is installed
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo Dependencies installed successfully!
echo.

REM Create public directory if not exists
if not exist "public" (
    echo Creating public directory...
    mkdir public
    echo Public directory created
) else (
    echo Public directory already exists
)
echo.

REM Check if port 4000 is available
echo Checking if port 4000 is available...
netstat -ano | findstr :4000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Warning: Port 4000 is already in use!
    echo You can use a different port by running: set PORT=8080 ^&^& npm start
) else (
    echo Port 4000 is available
)
echo.

echo ==========================================
echo   Setup Complete!                     
echo ==========================================
echo.
echo To start the server, run:
echo    npm start
echo.
echo Then open your browser and visit:
echo    http://localhost:4000 (local)
echo    http://YOUR_VPS_IP:4000 (from external)
echo.
echo To test with sample data, run:
echo    node test-send-data.js
echo.
echo For more information, read:
echo    - README.md (Full documentation)
echo    - QUICK_START.md (Quick start guide)
echo.
echo Happy coding!
echo.
pause

