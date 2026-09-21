@echo off
title TASK UNITY - Cooperative Gig Platform
cd /d "%~dp0"

echo ====================================================
echo    TASK UNITY -- Cooperative Gig Platform
echo ====================================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Step 1: Install backend dependencies if missing
if not exist "node_modules\" (
    echo [1/3] First-time setup: Installing root dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install root dependencies.
        pause
        exit /b 1
    )
)

:: Step 2: Install frontend dependencies if missing
if not exist "client\node_modules\" (
    echo [2/3] First-time setup: Installing client dependencies...
    call npm --prefix client install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install client dependencies.
        pause
        exit /b 1
    )
)

:: Step 3: Build frontend if not yet built
if not exist "client\dist\" (
    echo [3/3] Building production client frontend...
    call npm --prefix client run build
    if %errorlevel% neq 0 (
        echo [ERROR] Client build failed.
        pause
        exit /b 1
    )
)

echo.
echo ====================================================
echo  Starting TASK UNITY at http://localhost:5000
echo ====================================================
echo.

:: Automatically open default browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5000"

:: Start the server
call npm run server
pause
