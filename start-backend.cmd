@echo off
cd /d "%~dp0backend"
echo Starting backend on http://localhost:3001 ...
call npm run dev
pause
