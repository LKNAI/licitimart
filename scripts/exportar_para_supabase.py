"""Roda o coletor de producao (src/licitimart/ingestao/pncp.py) e escreve
DIRETO no Supabase real -- substitui, para quem ja tem projeto Supabase
configurado, a ponte via JSON de scripts/exportar_para_webapp.py. As duas
pontes coexistem por enquanto (ver supabase/README.md).

Exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY num .env na raiz do
projeto (gitignored) -- nunca cole a chave no chat.
"""
import sys
from pathlib import Path

REPO = Path(__file__).parent.parent
sys.path.insert(0, str(REPO / "src"))


def _carregar_dotenv(caminho: Path):
    if not caminho.exists():
        return
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        import os
        os.environ.setdefault(chave.strip(), valor.strip())


_carregar_dotenv(REPO / ".env")

from licitimart.ingestao.pendencias import FilaPendencias  # noqa: E402
from licitimart.ingestao.pncp import ColetorPublicacaoPNCP  # noqa: E402
from licitimart.ingestao.supabase_store import (  # noqa: E402
    criar_cliente,
    registrar_manifesto,
    sincronizar_pendencias,
    upsert_contratacoes,
)


def exportar(data_inicial: str, data_final: str, modalidades: list[int], orcamento_segundos: int):
    cliente = criar_cliente()
    pendencias = FilaPendencias(REPO / "data" / "interim" / "ingestao" / "pendencias_pncp.json")

    itens_brutos = []
    with ColetorPublicacaoPNCP(pendencias, modalidades=modalidades) as coletor:
        for item in coletor.coletar_dia(data_inicial, data_final, orcamento_segundos=orcamento_segundos):
            itens_brutos.append(item)

    total_upsertado = upsert_contratacoes(cliente, itens_brutos)
    registrar_manifesto(
        cliente,
        fonte="pncp",
        consulta={"dataInicial": data_inicial, "dataFinal": data_final, "modalidades": modalidades},
        contagem=total_upsertado,
    )
    total_pendencias = sincronizar_pendencias(cliente, pendencias.listar(fonte="pncp"))

    print(f"{total_upsertado} contratação(ões) upsertada(s) no Supabase (tabela contratacoes)")
    print(f"1 manifesto registrado (tabela manifestos_ingestao)")
    print(f"{total_pendencias} pendência(s) sincronizada(s) (tabela pendencias_ingestao)")


if __name__ == "__main__":
    exportar(
        data_inicial="20260908",
        data_final="20260908",
        modalidades=[1, 4, 5],
        orcamento_segundos=60,
    )
