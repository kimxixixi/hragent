@echo off
setlocal
cd /d "%~dp0"

echo [chroma] one-time setup: create venv and install ChromaDB ...
python -m venv .venv-chroma
".venv-chroma\Scripts\python.exe" -m pip install --upgrade pip -q
".venv-chroma\Scripts\python.exe" -m pip install chromadb

call "%~dp0start-chroma.cmd"

cd /d "%~dp0backend"
echo [kb] building knowledge base (embeddings + ChromaDB) ...
call npm run kb:build
echo [kb] done.
pause
