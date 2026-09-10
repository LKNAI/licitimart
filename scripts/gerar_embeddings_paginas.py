"""Backfill de embedding POR PAGINA de documento extraido (Fase S,
extensao de RF-005) -- fatia texto_extraido usando paginas_offsets (Fase
M) em vez de embutir o documento inteiro (perderia especificidade).
DOCX (sem paginas_offsets) vira um chunk unico (pagina=None).

Mesmo modelo local via fastembed (sem chave de API).

Uso:
    .venv/Scripts/python.exe scripts/gerar_embeddings_paginas.py --limite 50
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


def fatiar_por_pagina(texto: str, offsets: list[int] | None) -> list[tuple[int | None, str]]:
    """Retorna [(numero_pagina_ou_None, texto_da_pagina), ...]. Espelha a
    logica de offsets de extracao.py: offsets[i] e o indice de inicio da
    pagina i (0-based) dentro de texto."""
    if not offsets:
        return [(None, texto)] if texto.strip() else []
    paginas = []
    for i, inicio in enumerate(offsets):
        fim = offsets[i + 1] - 1 if i + 1 < len(offsets) else len(texto)
        trecho = texto[inicio:fim].strip()
        if trecho:
            paginas.append((i + 1, trecho))
    return paginas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limite", type=int, default=50, help="quantos documentos processar nesta execução")
    args = parser.parse_args()

    from fastembed import TextEmbedding

    cliente = store.criar_cliente()

    ja_processados = {
        row["documento_id"] for row in cliente.table("documento_paginas").select("documento_id").execute().data
    }
    documentos = (
        cliente.table("documentos_contratacao")
        .select("id, contratacao_id, texto_extraido, paginas_offsets, status_extracao")
        .eq("status_extracao", "extraido_nativo")
        .not_.is_("texto_extraido", "null")
        .limit(args.limite * 3)  # sobra pra filtrar os ja processados
        .execute()
        .data
    )
    pendentes = [d for d in documentos if d["id"] not in ja_processados][: args.limite]
    logger.info("lote desta execução: %d documento(s) sem páginas indexadas ainda", len(pendentes))
    if not pendentes:
        return

    logger.info("carregando modelo %s...", MODELO)
    modelo = TextEmbedding(model_name=MODELO)

    total_paginas = 0
    for doc in pendentes:
        paginas = fatiar_por_pagina(doc["texto_extraido"], doc.get("paginas_offsets"))
        if not paginas:
            continue
        textos = [p[1] for p in paginas]
        vetores = list(modelo.embed(textos))
        linhas = [
            {
                "documento_id": doc["id"],
                "contratacao_id": doc["contratacao_id"],
                "pagina": num_pagina,
                "texto": texto,
                "embedding": "[" + ",".join(f"{x:.6f}" for x in vetor) + "]",
            }
            for (num_pagina, texto), vetor in zip(paginas, vetores)
        ]
        cliente.table("documento_paginas").upsert(linhas, on_conflict="documento_id,pagina").execute()
        total_paginas += len(linhas)
        logger.info("documento %s: %d página(s) indexada(s)", doc["id"], len(linhas))

    logger.info("concluído: %d documento(s), %d página(s) no total", len(pendentes), total_paginas)


if __name__ == "__main__":
    main()
