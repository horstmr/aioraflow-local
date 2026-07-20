#!/bin/bash
# AioraFlow — iniciar no macOS/Linux (modo navegador).
# Dê dois cliques neste arquivo. Na primeira vez ele prepara o ambiente.
set -e
cd "$(dirname "$0")"

PY="${PYTHON:-python3}"

if ! command -v "$PY" >/dev/null 2>&1; then
  echo "Python 3 não encontrado."
  echo "Instale em https://www.python.org/downloads/ e rode este arquivo de novo."
  read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
  exit 1
fi

if [ ! -d ".venv" ]; then
  echo "Preparando o ambiente (só na primeira vez — pode levar alguns minutos)..."
  "$PY" -m venv .venv
  ./.venv/bin/python -m pip install --upgrade pip
  ./.venv/bin/python -m pip install -r requirements-web.txt
fi

echo "Iniciando o AioraFlow..."
./.venv/bin/python run_web.py
