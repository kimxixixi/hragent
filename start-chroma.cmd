@echo off
setlocal
cd /d "%~dp0"

curl -s -o nul http://localhost:8000/api/v2/heartbeat
if %errorlevel%==0 (
  echo [chroma] already running on :8000
  exit /b 0
)

if not exist "%~dp0.venv-chroma\Scripts\chroma.exe" (
  echo [chroma] ERROR: .venv-chroma not found. Run setup-chroma.cmd first.
  exit /b 1
)

echo [chroma] starting local ChromaDB server on :8000 ...
start "chroma" /min "%~dp0.venv-chroma\Scripts\chroma.exe" run --path "%~dp0backend\data\chroma" --port 8000

echo [chroma] waiting for server to be ready ...
timeout /t 4 /nobreak >nul

curl -s -o nul http://localhost:8000/api/v2/heartbeat
if %errorlevel%==0 (
  echo [chroma] ready
) else (
  echo [chroma] WARN: not ready yet, backend will degrade gracefully (no RAG)
)
exit /b 0
