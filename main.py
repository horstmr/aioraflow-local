"""
AioraFlow - aplicativo local (desktop) com pywebview + backend Flask.

Da conversa ao prontuário: grava o áudio da consulta, transcreve localmente
(faster-whisper) e gera o prontuário estruturado com a API da Anthropic (Claude).

Uso:
    pip install -r requirements.txt
    python main.py

Configure a chave da API da Anthropic dentro do app (tela "Configurações")
ou na variável de ambiente ANTHROPIC_API_KEY.
"""

import os

import webview

from app.server import app


def _selftest(destino):
    """Valida que todas as dependências nativas carregam no executável empacotado."""
    try:
        import av, ctranslate2, onnxruntime, imageio_ffmpeg, faster_whisper  # noqa: F401
        import anthropic, flask, docx  # noqa: F401

        with app.test_client() as client:
            assert client.get("/api/config").status_code == 200
        msg = "SELFTEST OK"
    except Exception as e:  # noqa: BLE001
        msg = "SELFTEST FAIL: " + repr(e)
    try:
        with open(destino, "w", encoding="utf-8") as f:
            f.write(msg)
    except OSError:
        pass
    print(msg)


def main():
    destino = os.environ.get("AIORA_SELFTEST")
    if destino:
        _selftest(destino)
        return
    webview.create_window(
        "AioraFlow",
        app,  # pywebview serve a aplicação Flask (WSGI) automaticamente
        width=1180,
        height=840,
        min_size=(560, 640),
        background_color="#0A0F0C",
    )
    # Permite gravação de microfone no WebView2 (getUserMedia).
    webview.start(private_mode=False)


if __name__ == "__main__":
    main()
