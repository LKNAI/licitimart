"""Bridge igual a exportar_para_webapp.py, mas para RF-017 (Impugnacao
Assistida): roda o detector + gerador de minuta REAIS do spike 03 (sem
LLM, template deterministico) sobre editais sinteticos, e exporta o
resultado para o webapp ler.

Nao gera minuta sobre dossie real do PNCP -- os itens reais tem achados=[]
(zero analise feita, RNF-012), entao nao ha nada para fundamentar. Isso
aqui e exemplo de vitrine do gerador, rotulado como tal.
"""
import json
import sys
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).parent.parent
sys.path.insert(0, str(REPO / "spikes" / "03_impugnacao_assistida"))

from detector import detectar
from minuta import ContextoEdital, gerar_minuta

DESTINO = REPO / "src" / "licitimart" / "web" / "src" / "lib" / "data" / "minutas_exemplo.json"

CASOS = [
    {
        "contexto": ContextoEdital(
            numero_controle_pncp="00394544000185-1-000301/2026 (exemplo sintético)",
            orgao="Secretaria Estadual de Educação — Exemplo/UF",
            objeto="Aquisição de equipamentos e serviço de instalação",
        ),
        "texto": (
            "O equipamento ofertado deverá ser da marca Xylotech, modelo XT-500, "
            "não sendo aceitos produtos de outras marcas. "
            "O responsável técnico deverá possuir registro no CREA/SP, sem admitir "
            "registro de outros estados. "
            "Será exigida garantia de proposta correspondente a 3% do valor estimado da contratação."
        ),
    },
    {
        "contexto": ContextoEdital(
            numero_controle_pncp="00394544000185-1-000450/2026 (exemplo sintético)",
            orgao="Prefeitura Municipal — Exemplo/UF",
            objeto="Contratação de serviço de engenharia predial",
        ),
        "texto": (
            "A visita técnica obrigatória deverá ser agendada previamente. O prazo de entrega "
            "dos serviços será de 2 (dois) dias corridos após a assinatura do contrato. "
            "A comprovação de capacidade técnica deverá ser feita mediante atestados "
            "de execução em um único contrato, não sendo aceito o somatório de atestados."
        ),
    },
]


def exportar():
    exemplos = []
    for caso in CASOS:
        achados = detectar(caso["texto"])
        if not achados:
            continue
        minuta = gerar_minuta(caso["contexto"], achados)
        exemplos.append({
            "contexto": asdict(caso["contexto"]),
            "textoEditalSintetico": caso["texto"],
            "achados": achados,
            "minutaMarkdown": minuta,
        })

    payload = {
        "geradoEm": datetime.now(timezone.utc).isoformat(),
        "geradoPor": "spikes/03_impugnacao_assistida/detector.py + minuta.py (determinístico, sem LLM)",
        "exemplos": exemplos,
    }

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(exemplos)} exemplo(s) de minuta exportado(s) para {DESTINO}")


if __name__ == "__main__":
    exportar()
