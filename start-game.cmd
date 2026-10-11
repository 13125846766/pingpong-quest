@echo off
cd /d "%~dp0"
if exist "dist\offline\pingpong-quest.html" (
  start "" "dist\offline\pingpong-quest.html"
  exit /b
)
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.12+ first, or download the offline HTML release.
  pause
  exit /b 1
)
if not exist "node_modules\vite" (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node scripts/start.mjs
pause
