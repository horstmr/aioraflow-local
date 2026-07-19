"""Carregamento e gravação da configuração local (config.json)."""

import json
import os
import sys


def dir_dados():
    """Pasta onde ficam config.json e o banco de dados: ao lado do executável
    (quando empacotado) ou na raiz do projeto (execução via `python`)."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


CONFIG_PATH = os.path.join(dir_dados(), "config.json")

DEFAULTS = {
    "anthropic_api_key": "",
    "claude_model": "claude-opus-4-8",
    "whisper_model": "base",     # tiny | base | small | medium | large-v3
    "whisper_language": "pt",
    "clinica": "",               # nome da clínica/profissional (aparece no cabeçalho)
}


def carregar():
    """Devolve a configuração mesclada com os padrões."""
    dados = dict(DEFAULTS)
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                dados.update(json.load(f))
        except (json.JSONDecodeError, OSError):
            pass
    return dados


def salvar(novos):
    """Grava apenas as chaves conhecidas; devolve a config atualizada."""
    atual = carregar()
    for chave in DEFAULTS:
        if chave in novos:
            atual[chave] = novos[chave]
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(atual, f, ensure_ascii=False, indent=2)
    return atual


def api_key():
    """A variável de ambiente ANTHROPIC_API_KEY tem prioridade sobre o config.json."""
    return os.environ.get("ANTHROPIC_API_KEY") or carregar().get("anthropic_api_key", "")
