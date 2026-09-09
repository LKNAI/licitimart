"""Exemplo de ponta a ponta: texto de edital sintetico -> achados do
detector -> minuta montada por template. Roda sem rede, sem LLM, sem
custo -- prova de conceito de RF-017 usando so o que ja temos hoje."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from detector import detectar
from minuta import ContextoEdital, gerar_minuta

TEXTO_EDITAL_SINTETICO = (
    "O equipamento ofertado deverá ser da marca Xylotech, modelo XT-500, "
    "não sendo aceitos produtos de outras marcas. "
    "O responsável técnico deverá possuir registro no CREA/SP, sem admitir "
    "registro de outros estados. "
    "Será exigida garantia de proposta correspondente a 3% do valor estimado da contratação."
)

if __name__ == "__main__":
    achados = detectar(TEXTO_EDITAL_SINTETICO)
    contexto = ContextoEdital(
        numero_controle_pncp="00394544000185-1-000301/2026",
        orgao="Secretaria Estadual de Educação — Exemplo/UF",
        objeto="Aquisição de equipamentos e serviço de instalação",
    )
    minuta = gerar_minuta(contexto, achados)

    saida = Path(__file__).parent / "resultados" / "minuta_exemplo.md"
    saida.parent.mkdir(exist_ok=True)
    saida.write_text(minuta, encoding="utf-8")
    print(f"{len(achados)} achado(s) -> minuta gerada em {saida}")
