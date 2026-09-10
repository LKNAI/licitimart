"""Backfill de itens_licitacao (RF-008) para contratacoes ja coletadas que
ainda nao tem item nenhum.

Cada contratacao = 1 chamada nova ao PNCP (N+1) -- por isso este script
roda em lote limitado por --limite, nunca "todas de uma vez" numa sessao
so. Respeita o mesmo ThrottleComDescoberta usado na coleta de publicacao
(e a mesma infraestrutura PNCP, o limite empirico vale para os dois).

Uso:
    .venv/Scripts/python.exe scripts/backfill_itens.py --limite 20
"""
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from licitimart.ingestao import supabase_store as store
from licitimart.ingestao.pendencias import FilaPendencias
from licitimart.ingestao.pncp import ColetorPublicacaoPNCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def contratacoes_sem_itens(cliente, limite: int) -> list[dict]:
    """Contratacoes que ainda nao tem nenhuma linha em itens_licitacao --
    consulta simples client-side (nao um NOT IN SQL) porque o volume atual
    (centenas) nao justifica a complexidade de uma query anti-join aqui."""
    todas = cliente.table("contratacoes").select("id, numero_controle_pncp").execute().data
    com_item = {
        row["contratacao_id"]
        for row in cliente.table("itens_licitacao").select("contratacao_id").execute().data
    }
    pendentes = [c for c in todas if c["id"] not in com_item]
    return pendentes[:limite]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limite", type=int, default=15, help="quantas contratações processar nesta execução")
    args = parser.parse_args()

    cliente = store.criar_cliente()
    alvo = contratacoes_sem_itens(cliente, args.limite)
    logger.info("lote desta execução: %d contratação(ões) sem item ainda", len(alvo))

    fila = FilaPendencias(Path("data") / "pendencias_backfill_itens.json")
    total_itens = 0
    falhas = 0
    with ColetorPublicacaoPNCP(fila) as coletor:
        for i, c in enumerate(alvo, 1):
            itens = coletor.buscar_itens(c["numero_controle_pncp"])
            if itens is None:
                falhas += 1
                logger.warning("[%d/%d] %s -- falhou, tentar de novo depois", i, len(alvo), c["numero_controle_pncp"])
                continue
            n = store.upsert_itens_licitacao(cliente, c["id"], itens)
            total_itens += n
            logger.info("[%d/%d] %s -- %d item(ns)", i, len(alvo), c["numero_controle_pncp"], n)

    logger.info("concluído: %d contratação(ões) processada(s), %d item(ns) gravado(s), %d falha(s)",
                len(alvo) - falhas, total_itens, falhas)


if __name__ == "__main__":
    main()
