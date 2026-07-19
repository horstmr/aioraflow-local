"""Transcrição de áudio local com faster-whisper (roda offline, na CPU)."""

import threading

from faster_whisper import WhisperModel

from . import config

_modelo = None
_modelo_nome = None
_lock = threading.Lock()


def _obter_modelo(nome):
    """Carrega o modelo Whisper sob demanda e o mantém em memória."""
    global _modelo, _modelo_nome
    with _lock:
        if _modelo is None or _modelo_nome != nome:
            # int8 na CPU: baixo uso de memória e sem dependência de GPU.
            _modelo = WhisperModel(nome, device="cpu", compute_type="int8")
            _modelo_nome = nome
        return _modelo


def transcrever(caminho_audio):
    """
    Transcreve um arquivo de áudio e devolve (texto, duracao_seg).

    O modelo é baixado do Hugging Face na primeira utilização (uma única vez).
    """
    cfg = config.carregar()
    modelo = _obter_modelo(cfg.get("whisper_model", "base"))
    idioma = cfg.get("whisper_language") or None

    segmentos, info = modelo.transcribe(
        caminho_audio,
        language=idioma,
        vad_filter=True,  # ignora silêncios longos
    )
    texto = " ".join(seg.text.strip() for seg in segmentos).strip()
    return texto, float(getattr(info, "duration", 0.0) or 0.0)
