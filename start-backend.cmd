@echo off
setlocal
cd /d "%~dp0"

call "%~dp0start-chroma.cmd"

cd /d "%~dp0backend"
echo Starting backend on http://localhost:3001 ...
call npm run dev
pause
