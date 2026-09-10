"""Preenche paginas_offsets (Fase M, RF-006) para documentos ja
extraidos na Fase K, sem baixar do PNCP de novo -- le o PDF/DOCX que ja
esta no Storage e reextrai.

Uso:
    .venv/Scripts/python.exe scripts/reprocessar_paginas_offsets.py
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from licitimart.ingestao import extracao
from licitimart.ingestao import supabase_store as store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main():
    cliente = store.criar_cliente()
    pendentes = (
        cliente.table("documentos_contratacao")
        .select("id, contratacao_id, storage_path, titulo, tipo_documento, sequencial_documento")
        .is_("paginas_offsets", "null")
        .eq("status_extracao", "extraido_nativo")
        .execute()
        .data
    )
    logger.info("%d documento(s) para reprocessar", len(pendentes))

    for d in pendentes:
        conteudo = cliente.storage.from_(store.BUCKET_DOCUMENTOS).download(d["storage_path"])
        texto, status, paginas, offsets = extracao.extrair_texto(conteudo, d["titulo"] or "")
        # busca numero_controle_pncp da contratacao pai pra reusar salvar_documento (upsert)
        contratacao = cliente.table("contratacoes").select("numero_controle_pncp").eq("id", d["contratacao_id"]).single().execute().data
        store.salvar_documento(
            cliente, d["contratacao_id"], contratacao["numero_controle_pncp"], d["sequencial_documento"],
            d["titulo"], d["tipo_documento"], conteudo, texto, status, paginas, offsets,
        )
        logger.info("reprocessado: %s -- %d offset(s) de página", d["titulo"], len(offsets))


if __name__ == "__main__":
    main()
