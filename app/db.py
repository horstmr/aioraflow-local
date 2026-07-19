"""Banco de dados local em SQLite (pacientes/consultas)."""

import json
import os
import sqlite3
from datetime import datetime

from .config import dir_dados

DATA_DIR = os.path.join(dir_dados(), "data")
DB_PATH = os.path.join(DATA_DIR, "aioraflow.db")


def _conexao():
    os.makedirs(DATA_DIR, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def inicializar():
    with _conexao() as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS consultas (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                paciente        TEXT NOT NULL DEFAULT '',
                especialidade   TEXT NOT NULL DEFAULT '',
                criado_em       TEXT NOT NULL,
                atualizado_em   TEXT NOT NULL,
                transcricao     TEXT NOT NULL DEFAULT '',
                prontuario_json TEXT NOT NULL DEFAULT '',
                duracao_seg     REAL NOT NULL DEFAULT 0
            )
            """
        )
        # Migração para bancos criados antes da coluna 'especialidade'.
        colunas = {r["name"] for r in con.execute("PRAGMA table_info(consultas)")}
        if "especialidade" not in colunas:
            con.execute("ALTER TABLE consultas ADD COLUMN especialidade TEXT NOT NULL DEFAULT ''")


def _linha_para_dict(row):
    d = dict(row)
    try:
        d["prontuario"] = json.loads(d.pop("prontuario_json") or "null")
    except json.JSONDecodeError:
        d["prontuario"] = None
    return d


def listar():
    with _conexao() as con:
        rows = con.execute(
            "SELECT * FROM consultas ORDER BY datetime(atualizado_em) DESC"
        ).fetchall()
    return [_linha_para_dict(r) for r in rows]


def obter(consulta_id):
    with _conexao() as con:
        row = con.execute(
            "SELECT * FROM consultas WHERE id = ?", (consulta_id,)
        ).fetchone()
    return _linha_para_dict(row) if row else None


def criar(paciente="", especialidade=""):
    agora = datetime.now().isoformat(timespec="seconds")
    with _conexao() as con:
        cur = con.execute(
            "INSERT INTO consultas (paciente, especialidade, criado_em, atualizado_em) "
            "VALUES (?, ?, ?, ?)",
            (paciente, especialidade, agora, agora),
        )
        novo_id = cur.lastrowid
    return obter(novo_id)


def atualizar(consulta_id, campos):
    permitidos = {"paciente", "especialidade", "transcricao", "duracao_seg"}
    sets, valores = [], []
    for chave, valor in campos.items():
        if chave in permitidos:
            sets.append(f"{chave} = ?")
            valores.append(valor)
    if "prontuario" in campos:
        sets.append("prontuario_json = ?")
        valores.append(json.dumps(campos["prontuario"], ensure_ascii=False))
    sets.append("atualizado_em = ?")
    valores.append(datetime.now().isoformat(timespec="seconds"))
    valores.append(consulta_id)
    with _conexao() as con:
        con.execute(f"UPDATE consultas SET {', '.join(sets)} WHERE id = ?", valores)
    return obter(consulta_id)


def remover(consulta_id):
    with _conexao() as con:
        con.execute("DELETE FROM consultas WHERE id = ?", (consulta_id,))
