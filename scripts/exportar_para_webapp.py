"""Ponte real entre a ingestao Python e o webapp Next.js -- sem Supabase,
sem LLM, sem inventar analise que ainda nao existe.

Roda o coletor de producao (src/licitimart/ingestao/pncp.py) para uma janela
curta de datas e exporta um JSON simplificado que o webapp le como dado
estatico. Decisao deliberada sobre o que NAO fazer aqui: nenhum item
exportado recebe veredito Go/No-Go nem achado nenhum -- isso exigiria os
agentes AG-01 a AG-05, que dependem de LLM (sem chave neste ambiente).
Todo item real entra com veredito "revisao_humana" e confiabilidade
"fonte_unica", porque e exatamente isso que e verdade hoje: dado ingerido,
zero analise feita. Fingir um veredito bonito sobre dado nao analisado
seria a mesma mentira que RNF-012 existe para proibir.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).parent.parent
sys.path.insert(0, str(REPO / "src"))

from licitimart.ingestao.pendencias import FilaPendencias
from licitimart.ingestao.pncp import ColetorPublicacaoPNCP

DESTINO = REPO / "src" / "licitimart" / "web" / "src" / "lib" / "data" / "contratacoes_pncp.json"


def exportar(data_inicial: str, data_final: str, modalidades: list[int], orcamento_segundos: int):
    pendencias = FilaPendencias(REPO / "data" / "interim" / "ingestao" / "pendencias_pncp.json")

    itens_exportados = []
    with ColetorPublicacaoPNCP(pendencias, modalidades=modalidades) as coletor:
        for item in coletor.coletar_dia(data_inicial, data_final, orcamento_segundos=orcamento_segundos):
            itens_exportados.append({
                "numeroControlePNCP": item.get("numeroControlePNCP"),
                "orgao": (item.get("orgaoEntidade") or {}).get("razaoSocial"),
                "municipioUf": f"{(item.get('unidadeOrgao') or {}).get('municipioNome')}/{(item.get('unidadeOrgao') or {}).get('ufSigla')}",
                "objeto": item.get("objetoCompra"),
                "modalidade": item.get("modalidadeNome"),
                "valorEstimado": item.get("valorTotalEstimado"),
                "dataPublicacao": item.get("dataPublicacaoPncp"),
            })
        nivel_seguro = coletor.throttle.nivel_seguro_conhecido
        erros_taxa = coletor.throttle.erros_taxa_vistos
        erros_rede = coletor.throttle.erros_rede_vistos

    payload = {
        "coletadoEm": datetime.now(timezone.utc).isoformat(),
        "fonte": "pncp",
        "janela": {"dataInicial": data_inicial, "dataFinal": data_final},
        "modalidadesConsultadas": modalidades,
        "pendenciasNaoResolvidas": pendencias.total(),
        "throttleNivelSeguro": round(nivel_seguro, 2),
        "throttleErrosTaxa": erros_taxa,
        "throttleErrosRede": erros_rede,
        "itens": itens_exportados,
    }

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(itens_exportados)} contratação(ões) exportada(s) para {DESTINO}")
    print(f"pendências não resolvidas na fila: {pendencias.total()}")
    return payload


if __name__ == "__main__":
    exportar(
        data_inicial="20260908",
        data_final="20260908",
        modalidades=[1, 4, 5, 6],
        orcamento_segundos=90,
    )
