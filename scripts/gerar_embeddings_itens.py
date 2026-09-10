"""Backfill de embedding POR ITEM (RF-008, Fase P) -- granularidade
diferente de scripts/gerar_embeddings.py, que embute contratacoes.objeto
(o edital inteiro). Aqui embute itens_licitacao.descricao, para o
Consultor de Precificacao comparar item com item por similaridade
semantica, nao por string identica.

Mesmo modelo local via fastembed (sem chave de API) -- ver
plan_fase_p.md.

Uso:
    .venv/Scripts/python.exe scripts/gerar_embeddings_itens.py --limite 1000
"""
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from licitimart.ingestao import supabase_store as store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MODELO = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limite", type=int, default=1000, help="quantos itens processar nesta execução")
    args = parser.parse_args()

    from fastembed import TextEmbedding

    cliente = store.criar_cliente()
    pendentes = (
        cliente.table("itens_licitacao")
        .select("id, descricao")
        .is_("descricao_embedding", "null")
        .not_.is_("descricao", "null")
        .limit(args.limite)
        .execute()
        .data
    )
    logger.info("lote desta execução: %d item(ns) sem embedding ainda", len(pendentes))
    if not pendentes:
        return

    logger.info("carregando modelo %s (cacheado desde gerar_embeddings.py, se já rodou)...", MODELO)
    modelo = TextEmbedding(model_name=MODELO)

    textos = [p["descricao"] for p in pendentes]
    vetores = list(modelo.embed(textos))

    for p, vetor in zip(pendentes, vetores):
        cliente.table("itens_licitacao").update({
            "descricao_embedding": "[" + ",".join(f"{x:.6f}" for x in vetor) + "]",
        }).eq("id", p["id"]).execute()

    logger.info("concluído: %d embedding(s) de item gravado(s)", len(pendentes))


if __name__ == "__main__":
    main()
