"""Servidor Flask: serve o frontend e a API local do AioraFlow."""

import os
import re
import tempfile

from flask import Flask, jsonify, request, send_file, send_from_directory

from . import config, db, export_docx, prontuario, transcribe

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(BASE_DIR, "web")

app = Flask(__name__, static_folder=WEB_DIR, static_url_path="")

db.inicializar()


# ---------- Frontend ----------
@app.route("/")
def index():
    return send_from_directory(WEB_DIR, "index.html")


# ---------- Consultas ----------
@app.get("/api/consultas")
def listar_consultas():
    return jsonify(db.listar())


@app.post("/api/consultas")
def criar_consulta():
    dados = request.get_json(silent=True) or {}
    return jsonify(
        db.criar(
            paciente=dados.get("paciente", "").strip(),
            especialidade=dados.get("especialidade", "").strip(),
        )
    ), 201


@app.get("/api/consultas/<int:consulta_id>")
def obter_consulta(consulta_id):
    consulta = db.obter(consulta_id)
    return (jsonify(consulta), 200) if consulta else (jsonify({"erro": "não encontrada"}), 404)


@app.put("/api/consultas/<int:consulta_id>")
def atualizar_consulta(consulta_id):
    dados = request.get_json(silent=True) or {}
    consulta = db.atualizar(consulta_id, dados)
    return (jsonify(consulta), 200) if consulta else (jsonify({"erro": "não encontrada"}), 404)


@app.delete("/api/consultas/<int:consulta_id>")
def remover_consulta(consulta_id):
    db.remover(consulta_id)
    return "", 204


# ---------- Transcrição ----------
@app.post("/api/consultas/<int:consulta_id>/transcrever")
def transcrever_consulta(consulta_id):
    if "audio" not in request.files:
        return jsonify({"erro": "nenhum áudio enviado"}), 400

    arquivo = request.files["audio"]
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
    try:
        arquivo.save(temp.name)
        temp.close()
        texto, duracao = transcribe.transcrever(temp.name)
    except Exception as e:  # noqa: BLE001 - devolve mensagem amigável ao frontend
        return jsonify({"erro": f"Falha na transcrição: {e}"}), 500
    finally:
        try:
            os.unlink(temp.name)
        except OSError:
            pass

    consulta = db.atualizar(consulta_id, {"transcricao": texto, "duracao_seg": duracao})
    return jsonify(consulta)


# ---------- Prontuário (IA) ----------
@app.post("/api/consultas/<int:consulta_id>/prontuario")
def gerar_prontuario(consulta_id):
    consulta = db.obter(consulta_id)
    if not consulta:
        return jsonify({"erro": "não encontrada"}), 404

    dados = request.get_json(silent=True) or {}
    transcricao = dados.get("transcricao", consulta.get("transcricao", ""))
    especialidade = dados.get("especialidade", consulta.get("especialidade", ""))

    try:
        estruturado = prontuario.gerar(transcricao, especialidade)
    except prontuario.ProntuarioError as e:
        return jsonify({"erro": str(e)}), 400

    consulta = db.atualizar(
        consulta_id,
        {"transcricao": transcricao, "especialidade": especialidade, "prontuario": estruturado},
    )
    return jsonify(consulta)


# ---------- Exportar Word (.docx) ----------
@app.get("/api/consultas/<int:consulta_id>/docx")
def exportar_docx(consulta_id):
    consulta = db.obter(consulta_id)
    if not consulta:
        return jsonify({"erro": "não encontrada"}), 404
    buffer = export_docx.gerar(consulta)
    base = (consulta.get("paciente") or "consulta").strip() or "consulta"
    slug = re.sub(r"[^A-Za-z0-9]+", "_", base).strip("_") or "consulta"
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"prontuario_{slug}.docx",
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


# ---------- Configuração ----------
@app.get("/api/config")
def obter_config():
    cfg = config.carregar()
    return jsonify(
        {
            "claude_model": cfg.get("claude_model"),
            "whisper_model": cfg.get("whisper_model"),
            "whisper_language": cfg.get("whisper_language"),
            "clinica": cfg.get("clinica"),
            "api_key_configurada": bool(config.api_key()),
            "api_key_via_ambiente": bool(os.environ.get("ANTHROPIC_API_KEY")),
        }
    )


@app.post("/api/config")
def salvar_config():
    dados = request.get_json(silent=True) or {}
    # Não sobrescreve a chave com um valor vazio (permite manter a existente).
    if "anthropic_api_key" in dados and not (dados["anthropic_api_key"] or "").strip():
        dados.pop("anthropic_api_key")
    config.salvar(dados)
    return obter_config()
