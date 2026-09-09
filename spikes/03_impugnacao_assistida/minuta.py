"""Gerador de minuta de impugnacao por TEMPLATE, nao por LLM.

Por que template e nao LLM: a fundamentacao de cada achado (detector.py)
ja e texto estatico, fixo por padrao -- nao precisa de geracao de linguagem
nenhuma, so montagem. Isso e deliberado: um documento juridico montado por
template determinístico e auditável (o mesmo achado sempre produz o mesmo
texto) e nao carrega risco de alucinacao, porque nao ha geracao de conteudo
novo -- so preenchimento de campos. Quando (e se) um LLM real entrar nesse
fluxo, sera para lapidar prosa sobre esses mesmos fatos fixos, nunca para
inventar fundamentacao juridica nova.

RN-006 (nunca prestar assistencia juridica direta): o aviso abaixo e fixo
no topo e no rodape, sem parametro para remover.
"""
from dataclasses import dataclass
from datetime import date

AVISO_RN006 = (
    "⚠️ RASCUNHO GERADO AUTOMATICAMENTE — NÃO SUBSTITUI ANÁLISE DE ADVOGADO HABILITADO. "
    "Este documento não é protocolado automaticamente em nome de ninguém. O ato de revisar, "
    "editar e protocolar é sempre humano e deliberado (RN-006)."
)


@dataclass
class ContextoEdital:
    numero_controle_pncp: str
    orgao: str
    objeto: str


def gerar_minuta(contexto: ContextoEdital, achados: list[dict]) -> str:
    if not achados:
        raise ValueError("gerar_minuta exige ao menos um achado -- não existe minuta vazia.")

    hoje = date.today().strftime("%d/%m/%Y")
    linhas = [
        AVISO_RN006,
        "",
        "# Minuta de Impugnação ao Edital",
        "",
        f"**Processo/Edital (nº controle PNCP):** {contexto.numero_controle_pncp}  ",
        f"**Órgão:** {contexto.orgao}  ",
        f"**Objeto:** {contexto.objeto}  ",
        f"**Data do rascunho:** {hoje}",
        "",
        "## Fundamentação",
        "",
        "A licitante que subscreve, tempestivamente, vem impugnar cláusula(s) do edital em "
        "epígrafe, pelos fundamentos a seguir.",
        "",
    ]

    for i, achado in enumerate(achados, start=1):
        linhas += [
            f"### {i}. {achado['explicacao']}",
            "",
            f"**Trecho impugnado:** \"{achado['trecho']}\"",
            "",
            f"**Fundamentação candidata:** {achado['fundamentacao_candidata']}",
            "",
            f"> {achado['aviso']}",
            "",
        ]

    linhas += [
        "## Pedido",
        "",
        "Ante o exposto, requer-se a Vossa Senhoria:",
        "",
        "a) o conhecimento e provimento da presente impugnação;",
        "b) a revisão e, se confirmada a restritividade indevida, a exclusão ou adequação "
        "da(s) cláusula(s) apontada(s), com nova publicação do edital corrigido e, se "
        "necessário, reabertura do prazo de propostas;",
        "c) subsidiariamente, a manifestação fundamentada sobre cada ponto levantado, caso "
        "o órgão entenda pela manutenção das exigências.",
        "",
        "Termos em que pede deferimento.",
        "",
        "---",
        "",
        AVISO_RN006,
    ]

    return "\n".join(linhas)
