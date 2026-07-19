"""Geração do prontuário a partir da transcrição, via API da Anthropic (Claude)."""

import json

import anthropic

from . import config

SYSTEM_PROMPT = """\
Você é um assistente de documentação clínica. A partir da transcrição de uma \
consulta médica (a conversa entre profissional e paciente), você organiza as \
informações em um prontuário estruturado, em português do Brasil, com \
terminologia médica adequada.

Regras:
- Baseie-se estritamente no que foi dito na transcrição. Não invente sintomas, \
diagnósticos, medicamentos ou dados que não aparecem no texto.
- Quando uma informação não estiver disponível, escreva "Não informado" no campo \
correspondente (não deixe em branco e não deduza).
- Seja objetivo e conciso, no estilo de um prontuário clínico.
- As hipóteses diagnósticas devem refletir apenas o que o raciocínio clínico da \
consulta indicou; se não houver, retorne uma lista vazia.
- Este texto é um rascunho de apoio: o profissional de saúde é sempre o \
responsável final pela revisão e validação do prontuário."""

SCHEMA = {
    "type": "object",
    "properties": {
        "queixa_principal": {"type": "string"},
        "historia_doenca_atual": {"type": "string"},
        "antecedentes": {"type": "string"},
        "exame_fisico": {"type": "string"},
        "hipoteses_diagnosticas": {"type": "array", "items": {"type": "string"}},
        "conduta": {"type": "string"},
        "observacoes": {"type": "string"},
    },
    "required": [
        "queixa_principal",
        "historia_doenca_atual",
        "antecedentes",
        "exame_fisico",
        "hipoteses_diagnosticas",
        "conduta",
        "observacoes",
    ],
    "additionalProperties": False,
}


class ProntuarioError(Exception):
    """Erro amigável para exibir na interface."""


def gerar(transcricao, especialidade=""):
    """Recebe a transcrição e devolve o prontuário estruturado (dict)."""
    if not (transcricao or "").strip():
        raise ProntuarioError("A transcrição está vazia — grave ou digite a consulta primeiro.")

    chave = config.api_key()
    if not chave:
        raise ProntuarioError(
            "Chave da API da Anthropic não configurada. "
            "Defina-a em Configurações (ou na variável de ambiente ANTHROPIC_API_KEY)."
        )

    system = SYSTEM_PROMPT
    if (especialidade or "").strip():
        system += (
            f"\n\nEspecialidade da consulta: {especialidade.strip()}. "
            "Use a terminologia, os achados e o raciocínio clínico típicos dessa "
            "especialidade, sem sair do que a transcrição informa."
        )

    cfg = config.carregar()
    client = anthropic.Anthropic(api_key=chave)

    try:
        resposta = client.messages.create(
            model=cfg.get("claude_model", "claude-opus-4-8"),
            max_tokens=8000,
            system=system,
            messages=[{"role": "user", "content": transcricao}],
            output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
        )
    except anthropic.AuthenticationError:
        raise ProntuarioError("Chave da API inválida. Verifique-a em Configurações.")
    except anthropic.RateLimitError:
        raise ProntuarioError("Limite de uso da API atingido. Tente novamente em instantes.")
    except anthropic.APIStatusError as e:
        raise ProntuarioError(f"Erro da API ({e.status_code}): {e.message}")
    except anthropic.APIConnectionError:
        raise ProntuarioError("Falha de conexão com a API. Verifique sua internet.")

    if resposta.stop_reason == "refusal":
        raise ProntuarioError("O modelo não pôde processar esta transcrição.")

    texto = next((b.text for b in resposta.content if b.type == "text"), "")
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        raise ProntuarioError("A resposta do modelo não pôde ser interpretada. Tente novamente.")
