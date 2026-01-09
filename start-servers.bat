@echo off
echo 🎾 Starting GameOn Servers...
echo.

echo 📋 Prerequisites:
echo 1. Make sure MongoDB is installed and running
echo 2. If you haven't installed MongoDB, see server/server/start-mongodb.md
echo.

echo 🔧 Starting Backend Server...
cd server\server
start "GameOn Backend" cmd /k "node server.js"

echo.
echo ⏳ Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo 🌐 Starting Frontend Server...
cd ..\..
start "GameOn Frontend" cmd /k "npm run dev"

echo.
echo ✅ Both servers are starting...
echo.
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul 