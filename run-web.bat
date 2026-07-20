@echo off
REM AioraFlow - iniciar no Windows (modo navegador).
REM De dois cliques neste arquivo. Na primeira vez ele prepara o ambiente.
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo Python nao encontrado. Instale em https://www.python.org/downloads/
  pause
  exit /b 1
)

if not exist ".venv" (
  echo Preparando o ambiente ^(so na primeira vez - pode levar alguns minutos^)...
  python -m venv .venv
  .venv\Scripts\python -m pip install --upgrade pip
  .venv\Scripts\python -m pip install -r requirements-web.txt
)

echo Iniciando o AioraFlow...
.venv\Scripts\python run_web.py
pause
