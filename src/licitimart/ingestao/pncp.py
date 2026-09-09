"""Conector de producao para /contratacoes/publicacao do PNCP.

Promovido de spikes/01_ingestao_pncp/ apos 3 rodadas de teste real (ver
spikes/01_ingestao_pncp/resultados/ e plan.md da rodada 3). Duas decisoes
de arquitetura que vieram direto da experiencia dos spikes, nao de suposicao:

1. codigoModalidadeContratacao e obrigatorio -- nao existe "varredura sem
   filtro"; iteramos pelas modalidades conhecidas (1 a 13).
2. Pagina que falha repetidamente nunca desaparece -- entra na FilaPendencias
   (pendencias.py), persistente em disco, porque a rodada 3 mostrou ao vivo
   que uma instabilidade do PNCP pode durar mais que uma segunda passada
   dentro do mesmo processo.
"""
import logging
import time
from collections.abc import Iterator
from pathlib import Path

import httpx

from .pendencias import FilaPendencias
from .throttle import ThrottleComDescoberta

logger = logging.getLogger(__name__)

BASE_URL = "https://pncp.gov.br/api/consulta/v1"
FONTE = "pncp"
TAMANHO_PAGINA = 50
MAX_PAGINAS_POR_MODALIDADE = 200
MAX_TENTATIVAS_POR_PAGINA = 6
TIMEOUT_CLIENTE_SEGUNDOS = 8.0

# Sondado manualmente contra o PNCP real (ver spikes/01_ingestao_pncp);
# 2 e 3 podem responder 204 em dias sem contratacao dessa modalidade --
# isso nao invalida o codigo, so significa "sem resultado esse dia".
MODALIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]


class ColetorPublicacaoPNCP:
    def __init__(self, pendencias: FilaPendencias, modalidades: list[int] | None = None):
        self._pendencias = pendencias
        self._modalidades = modalidades or MODALIDADES
        self._throttle = ThrottleComDescoberta()
        self._cliente = httpx.Client(timeout=TIMEOUT_CLIENTE_SEGUNDOS)

    def fechar(self):
        self._cliente.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.fechar()

    @property
    def throttle(self) -> ThrottleComDescoberta:
        return self._throttle

    def _buscar_pagina(self, modalidade: int, pagina: int, data_inicial: str, data_final: str):
        """Uma tentativa. Retorna ('sucesso', itens) | ('fim_modalidade', None) | ('erro_taxa', None) | ('erro_rede', None)."""
        self._throttle.aguardar_vez()
        params = {
            "dataInicial": data_inicial, "dataFinal": data_final,
            "codigoModalidadeContratacao": modalidade, "pagina": pagina,
            "tamanhoPagina": TAMANHO_PAGINA,
        }
        try:
            resp = self._cliente.get(f"{BASE_URL}/contratacoes/publicacao", params=params)
        except httpx.RequestError as exc:
            self._throttle.registrar_erro_rede()
            logger.info("erro de rede mod=%s pag=%s: %s", modalidade, pagina, exc)
            return ("erro_rede", None)

        if resp.status_code == 200:
            corpo = resp.json()
            itens = corpo.get("data", []) if isinstance(corpo, dict) else []
            self._throttle.registrar_sucesso()
            return ("sucesso", itens)
        elif resp.status_code == 204:
            return ("fim_modalidade", None)
        elif resp.status_code in (429, 503):
            self._throttle.registrar_erro_taxa()
            return ("erro_taxa", None)
        else:
            logger.warning("status inesperado %s mod=%s pag=%s: %s", resp.status_code, modalidade, pagina, resp.text[:200])
            return ("fim_modalidade", None)

    def _tentar_pagina_com_retry(self, modalidade: int, pagina: int, data_inicial: str, data_final: str,
                                  prazo_monotonico: float | None = None):
        """prazo_monotonico (time.monotonic()) e opcional -- se passado, a
        retentativa para no meio das MAX_TENTATIVAS_POR_PAGINA quando o
        prazo global estourar, em vez de gastar ate 6x60s numa pagina so.
        Achado real (spike 01, rodada 3, 09/09): sem esse corte, uma
        sequencia de paginas travadas ultrapassou o orcamento pretendido
        de 15min em mais de 2min, porque o corte so existia ENTRE paginas."""
        for _ in range(MAX_TENTATIVAS_POR_PAGINA):
            if prazo_monotonico is not None and time.monotonic() > prazo_monotonico:
                logger.warning("prazo global estourado no meio da retentativa mod=%s pag=%s -- abandonando cedo", modalidade, pagina)
                return ("abandonada", "prazo_estourado")
            resultado, itens = self._buscar_pagina(modalidade, pagina, data_inicial, data_final)
            if resultado in ("sucesso", "fim_modalidade"):
                return (resultado, itens)
            # erro_taxa / erro_rede -> tenta de novo (throttle ja reagiu)
        motivo = "erro_taxa" if self._throttle.erros_taxa_vistos else "erro_rede"
        return ("abandonada", motivo)

    def coletar_dia(self, data_inicial: str, data_final: str, orcamento_segundos: float | None = None) -> Iterator[dict]:
        """Gera itens (dict cru da API) de todas as modalidades para a
        janela de datas, retentando primeiro pendencias antigas da mesma
        fonte antes de varrer dado novo.

        orcamento_segundos e opcional -- se passado, o prazo vale tanto
        ENTRE paginas quanto DENTRO das tentativas de uma pagina so. Sem
        essa segunda checagem, uma sequencia de paginas travadas pode
        ultrapassar bastante o orcamento pretendido (achado real, spike 01
        rodada 3: ~17min de execucao com teto de 15min)."""
        prazo = time.monotonic() + orcamento_segundos if orcamento_segundos is not None else None

        def prazo_estourado():
            return prazo is not None and time.monotonic() > prazo

        pendentes_antigas = self._pendencias.listar(fonte=FONTE)
        if pendentes_antigas:
            logger.info("retentando %d pendencia(s) antiga(s) antes da varredura normal", len(pendentes_antigas))
        for p in pendentes_antigas:
            if prazo_estourado():
                logger.warning("orcamento esgotado antes de concluir a retentativa de pendencias antigas")
                return
            resultado, dado = self._tentar_pagina_com_retry(p.modalidade, p.pagina, p.data_inicial, p.data_final, prazo)
            if resultado == "sucesso":
                self._pendencias.resolver(FONTE, p.modalidade, p.pagina, p.data_inicial, p.data_final)
                for item in dado:
                    yield item
            else:
                self._pendencias.registrar(FONTE, p.modalidade, p.pagina, p.data_inicial, p.data_final, motivo=dado)

        for modalidade in self._modalidades:
            if prazo_estourado():
                logger.warning("orcamento esgotado -- parando varredura na modalidade %s", modalidade)
                return
            pagina = 1
            while pagina <= MAX_PAGINAS_POR_MODALIDADE:
                if prazo_estourado():
                    logger.warning("orcamento esgotado -- parando mod=%s na pagina %s", modalidade, pagina)
                    return
                resultado, dado = self._tentar_pagina_com_retry(modalidade, pagina, data_inicial, data_final, prazo)
                if resultado == "sucesso":
                    if not dado:
                        break
                    for item in dado:
                        yield item
                    pagina += 1
                elif resultado == "fim_modalidade":
                    break
                else:  # abandonada
                    self._pendencias.registrar(FONTE, modalidade, pagina, data_inicial, data_final, motivo=dado)
                    logger.warning("mod=%s pag=%s abandonada apos %d tentativas -- registrada em FilaPendencias",
                                    modalidade, pagina, MAX_TENTATIVAS_POR_PAGINA)
                    break
