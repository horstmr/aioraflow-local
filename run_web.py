"""
AioraFlow — modo navegador (portátil).

Sobe o servidor local e abre o app no seu navegador. Não usa pywebview nem
empacotamento nativo: o comportamento é idêntico em Windows, macOS e Linux,
porque quem renderiza é o próprio navegador (use o Chrome para paridade total).

Uso:
    python run_web.py
"""

import socket
import threading
import webbrowser

from app.server import app

HOST = "127.0.0.1"


def _porta_livre():
    with socket.socket() as s:
        s.bind((HOST, 0))
        return s.getsockname()[1]


def main():
    porta = _porta_livre()
    url = f"http://{HOST}:{porta}/"

    # abre o navegador assim que o servidor estiver de pé
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    print("=" * 58)
    print("  AioraFlow rodando em:", url)
    print("  O navegador deve abrir sozinho. Se não abrir, copie o link.")
    print("  Para encerrar: Ctrl+C (ou feche esta janela).")
    print("=" * 58)

    # 127.0.0.1 é contexto seguro: o microfone (getUserMedia) funciona.
    app.run(host=HOST, port=porta, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
