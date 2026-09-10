"""Varredura nacional de METADADOS (RF-001) -- toda a base historica do
PNCP, nao so um dia/algumas modalidades. So metadado (barato, um GET
paginado); itens/documentos continuam sob demanda (ver
src/licitimart/web/src/lib/pncp/, Fase N parte 2), nunca em lote para
100% da base.

Chunking mensal por modalidade -- MAX_PAGINAS_POR_MODALIDADE=200 x
TAMANHO_PAGINA=50 = teto de 10.000 resultados por chamada de
coletar_dia(); um intervalo de anos numa modalidade de alto volume
(ex. Pregao Eletronico) pode passar disso e truncar silenciosamente
sem esse chunking (ver plan_fase_n.md).

Resumivel entre execucoes -- pode (e deve) rodar em varias chamadas ao
longo de dias, nunca um processo unico de horas a fio. Progresso por
(modalidade, ano-mes) persiste em disco; uma chamada nova pula direto
para o que falta.

Ponto de partida (2021-01) e uma SUPOSICAO (ano da Lei 14.133/2021, que
criou o PNCP), nao um fato confirmado -- um mes sem nenhum resultado
(204 na pagina 1) e so pulado, sem custo alto, sem tratar como erro.

Ordem: meses do MAIS RECENTE para o MAIS ANTIGO dentro de cada
modalidade -- para um radar de oportunidade de venda, uma contratacao
de 2021 ja encerrada vale muito menos que uma de mes passado; cobertura
historica funda e menos urgente que ter o recente coberto primeiro.

Modalidades priorizadas por padrao (--modalidades para mudar) --
Leilao (1, 13) fica de fora do default: e venda de bem publico
(descarte), nao oportunidade de compra para o setor privado vender ao
governo, que e o caso de uso do produto. Ordem: Pregao Eletronico (6,
disparado o mais comum), Concorrencia Eletronica (4), Dispensa (8),
Credenciamento (12), Inexigibilidade (9), Pregao Presencial (7),
Manifestacao de Interesse (10), Pre-qualificacao (11), Dialogo
Competitivo (2), Concurso (3).

Uso:
    .venv/Scripts/python.exe scripts/varredura_nacional.py \\
        --orcamento-total-segundos 3600 --orcamento-por-chunk-segundos 120

    .venv/Scripts/python.exe scripts/varredura_nacional.py --modalidades 6,4
"""
import argparse
import calendar
import json
import logging
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from licitimart.ingestao import supabase_store as store
from licitimart.ingestao.pendencias import FilaPendencias
from licitimart.ingestao.pncp import ColetorPublicacaoPNCP

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

ANO_MES_INICIAL = (2021, 1)
PENDENCIAS_PATH = Path("data") / "interim" / "ingestao" / "pendencias_pncp.json"
PROGRESSO_PATH = Path("data") / "interim" / "ingestao" / "progresso_varredura_nacional.json"

# Leilao (1, 13) fica de fora -- venda de bem publico, nao oportunidade
# de compra pelo setor privado. Ordem = prioridade (ver docstring).
MODALIDADES_PADRAO = [6, 4, 8, 12, 9, 7, 10, 11, 2, 3]


def _meses_do_mais_recente(inicio: tuple[int, int]) -> list[tuple[int, int]]:
    """Mais recente primeiro -- contratacao antiga e encerrada vale
    pouco para um radar de oportunidade (ver docstring do modulo)."""
    hoje = date.today()
    ano, mes = inicio
    meses = []
    while (ano, mes) <= (hoje.year, hoje.month):
        meses.append((ano, mes))
        mes += 1
        if mes > 12:
            mes = 1
            ano += 1
    return list(reversed(meses))


def _janela_do_mes(ano: int, mes: int) -> tuple[str, str]:
    ultimo_dia = calendar.monthrange(ano, mes)[1]
    return f"{ano:04d}{mes:02d}01", f"{ano:04d}{mes:02d}{ultimo_dia:02d}"


def _carregar_progresso() -> dict:
    if not PROGRESSO_PATH.exists():
        return {}
    conteudo = PROGRESSO_PATH.read_text(encoding="utf-8").strip()
    return json.loads(conteudo) if conteudo else {}


def _salvar_progresso(progresso: dict) -> None:
    PROGRESSO_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROGRESSO_PATH.write_text(json.dumps(progresso, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--orcamento-total-segundos", type=float, default=1800,
                         help="teto de tempo para esta chamada do script (default 30min)")
    parser.add_argument("--orcamento-por-chunk-segundos", type=float, default=120,
                         help="teto de tempo por (modalidade, mes) individual (default 2min)")
    parser.add_argument("--modalidades", type=str, default=None,
                         help="códigos separados por vírgula, em ordem de prioridade (default: %s)" % ",".join(map(str, MODALIDADES_PADRAO)))
    parser.add_argument("--meses-recentes", type=int, default=None,
                         help="limita a varredura aos N meses mais recentes por modalidade, em vez de voltar até 2021-01 (default: sem limite)")
    args = parser.parse_args()

    modalidades = (
        [int(m) for m in args.modalidades.split(",")] if args.modalidades else MODALIDADES_PADRAO
    )

    prazo_total = time.monotonic() + args.orcamento_total_segundos
    progresso = _carregar_progresso()
    cliente = store.criar_cliente()
    fila = FilaPendencias(PENDENCIAS_PATH)

    meses = _meses_do_mais_recente(ANO_MES_INICIAL)
    if args.meses_recentes is not None:
        meses = meses[:args.meses_recentes]
    chunks = [(mod, ano, mes) for mod in modalidades for (ano, mes) in meses]
    pendentes = [c for c in chunks if f"{c[0]}:{c[1]:04d}-{c[2]:02d}" not in progresso]
    logger.info("total de chunks (modalidade x mes): %d -- ja concluidos: %d -- restam: %d",
                len(chunks), len(chunks) - len(pendentes), len(pendentes))

    processados_nesta_execucao = 0
    total_contratacoes = 0
    for modalidade, ano, mes in pendentes:
        if time.monotonic() > prazo_total:
            logger.info("orcamento total da execucao esgotado -- parando, progresso salvo")
            break

        chave = f"{modalidade}:{ano:04d}-{mes:02d}"
        data_inicial, data_final = _janela_do_mes(ano, mes)

        itens_brutos = []
        with ColetorPublicacaoPNCP(fila, modalidades=[modalidade]) as coletor:
            for item in coletor.coletar_dia(data_inicial, data_final, orcamento_segundos=args.orcamento_por_chunk_segundos):
                itens_brutos.append(item)

        total_upsertado = store.upsert_contratacoes(cliente, itens_brutos)
        total_contratacoes += total_upsertado

        # Chunk so conta como concluido se nao sobrou pendencia pra ELE
        # especificamente (pode existir pendencia de outro chunk/execucao
        # anterior na mesma fila -- so a deste modalidade+janela importa aqui).
        pendencias_deste_chunk = [
            p for p in fila.listar(fonte="pncp")
            if p.modalidade == modalidade and p.data_inicial == data_inicial and p.data_final == data_final
        ]
        if pendencias_deste_chunk:
            logger.warning("mod=%s %04d-%02d -- %d pagina(s) pendente(s), NAO marcado como concluido (retenta em execucao futura)",
                            modalidade, ano, mes, len(pendencias_deste_chunk))
        else:
            progresso[chave] = {"contagem": total_upsertado, "concluido_em": time.strftime("%Y-%m-%dT%H:%M:%S")}
            _salvar_progresso(progresso)
            processados_nesta_execucao += 1
            logger.info("[%d/%d desta execução] mod=%s %04d-%02d -- %d contratação(ões)",
                        processados_nesta_execucao, len(pendentes), modalidade, ano, mes, total_upsertado)

    store.registrar_manifesto(
        cliente, fonte="pncp",
        consulta={"tipo": "varredura_nacional", "chunks_processados_nesta_execucao": processados_nesta_execucao},
        contagem=total_contratacoes,
    )
    total_pendencias = store.sincronizar_pendencias(cliente, fila.listar(fonte="pncp"))
    logger.info("execução concluída: %d chunk(s) marcados concluídos, %d contratação(ões) upsertada(s), %d pendência(s) na fila",
                processados_nesta_execucao, total_contratacoes, total_pendencias)
    # len(progresso) e global (soma de TODAS as modalidades ja tocadas em
    # qualquer execucao passada) -- comparar direto com len(chunks) (so
    # desta selecao de --modalidades) dava uma razao sem sentido quando
    # --modalidades muda de uma chamada pra outra. Filtra pelo prefixo
    # "modalidade:" da chave antes de comparar.
    concluidos_nesta_selecao = sum(1 for chave in progresso if int(chave.split(":")[0]) in modalidades)
    logger.info("progresso acumulado nesta seleção de modalidades: %d/%d chunks concluídos",
                concluidos_nesta_selecao, len(chunks))


if __name__ == "__main__":
    main()
