"""Gera embeddings (RF-005) para contratacoes.objeto que ainda nao tem
objeto_embedding. Modelo local via fastembed (ONNX, sem chave de API) --
o MESMO modelo/pooling usado em tempo real de busca pelo lado Node
(@huggingface/transformers, ver src/lib/embedding.ts), confirmado
empiricamente que os dois produzem embedding identico (ver plan_fase_j.md).

Uso:
    .venv/Scripts/python.exe scripts/gerar_embeddings.py --limite 100
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
    parser.add_argument("--limite", type=int, default=200, help="quantas contratações processar nesta execução")
    args = parser.parse_args()

    from fastembed import TextEmbedding

    cliente = store.criar_cliente()
    pendentes = (
        cliente.table("contratacoes")
        .select("id, objeto")
        .is_("objeto_embedding", "null")
        .not_.is_("objeto", "null")
        .limit(args.limite)
        .execute()
        .data
    )
    logger.info("lote desta execução: %d contratação(ões) sem embedding ainda", len(pendentes))
    if not pendentes:
        return

    logger.info("carregando modelo %s (primeira vez baixa ~220MB, cacheado depois)...", MODELO)
    modelo = TextEmbedding(model_name=MODELO)

    textos = [p["objeto"] for p in pendentes]
    vetores = list(modelo.embed(textos))

    for p, vetor in zip(pendentes, vetores):
        cliente.table("contratacoes").update({
            "objeto_embedding": "[" + ",".join(f"{x:.6f}" for x in vetor) + "]",
        }).eq("id", p["id"]).execute()

    logger.info("concluído: %d embedding(s) gravado(s)", len(pendentes))


if __name__ == "__main__":
    main()
