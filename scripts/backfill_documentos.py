"""Backfill de documentos_contratacao (RF-002) para contratacoes ja
coletadas que ainda nao tem documento nenhum. Baixa SO o documento tipo
"Edital" por contratacao (nao todo anexo -- ver plan_fase_k.md, decisao
3), extrai texto nativo (sem OCR pago) e guarda no Storage.

Lote bem menor que backfill_itens.py/gerar_embeddings.py -- documento
real tem alguns MB (o de teste tinha 8,6MB/59 paginas), ordem de
grandeza maior que JSON de metadado.

Uso:
    .venv/Scripts/python.exe scripts/backfill_documentos.py --limite 5
"""
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from licitimart.ingestao import extracao
from licitimart.ingestao import supabase_store as store
from licitimart.ingestao.pendencias import FilaPendencias
from licitimart.ingestao.pncp import ColetorPublicacaoPNCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def contratacoes_sem_documento(cliente, limite: int) -> list[dict]:
    todas = cliente.table("contratacoes").select("id, numero_controle_pncp").execute().data
    com_doc = {
        row["contratacao_id"]
        for row in cliente.table("documentos_contratacao").select("contratacao_id").execute().data
    }
    pendentes = [c for c in todas if c["id"] not in com_doc]
    return pendentes[:limite]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limite", type=int, default=5, help="quantas contratações processar nesta execução")
    args = parser.parse_args()

    cliente = store.criar_cliente()
    alvo = contratacoes_sem_documento(cliente, args.limite)
    logger.info("lote desta execução: %d contratação(ões) sem documento ainda", len(alvo))

    fila = FilaPendencias(Path("data") / "pendencias_backfill_documentos.json")
    processadas = 0
    falhas = 0
    with ColetorPublicacaoPNCP(fila) as coletor:
        for i, c in enumerate(alvo, 1):
            arquivos = coletor.buscar_arquivos(c["numero_controle_pncp"])
            if arquivos is None:
                falhas += 1
                logger.warning("[%d/%d] %s -- falhou listar arquivos", i, len(alvo), c["numero_controle_pncp"])
                continue
            editais = [a for a in arquivos if "edital" in (a.get("tipoDocumentoNome") or "").lower()]
            if not editais:
                logger.info("[%d/%d] %s -- sem documento tipo Edital, pulando", i, len(alvo), c["numero_controle_pncp"])
                continue
            alvo_arquivo = editais[0]

            conteudo = coletor.baixar_arquivo(alvo_arquivo["url"])
            if conteudo is None:
                falhas += 1
                logger.warning("[%d/%d] %s -- falhou baixar edital", i, len(alvo), c["numero_controle_pncp"])
                continue

            texto, status, paginas, offsets = extracao.extrair_texto(conteudo, alvo_arquivo["titulo"])
            store.salvar_documento(
                cliente, c["id"], c["numero_controle_pncp"], alvo_arquivo["sequencialDocumento"],
                alvo_arquivo["titulo"], alvo_arquivo.get("tipoDocumentoNome"), conteudo, texto, status, paginas, offsets,
            )
            processadas += 1
            logger.info("[%d/%d] %s -- status=%s paginas=%s chars=%d",
                        i, len(alvo), c["numero_controle_pncp"], status, paginas, len(texto))

    logger.info("concluído: %d documento(s) processado(s), %d falha(s)", processadas, falhas)


if __name__ == "__main__":
    main()
