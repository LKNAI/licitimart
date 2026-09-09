"""Limitador de taxa com descoberta empirica da margem segura.

Promovido de spikes/01_ingestao_pncp/throttle.py apos 3 rodadas de teste
contra o PNCP real (ver spikes/01_ingestao_pncp/resultados/). Nao herda
piso fixo de nenhum outro projeto -- descobre a margem segura na propria
execucao, e distingue sinal forte (429/503) de sinal ambiguo (timeout de
rede/conexao pendurada), porque tratar os dois com a mesma confianca
produzia uma margem de seguranca artificialmente pessimista (rodada 2).
"""
import logging
import threading
import time

logger = logging.getLogger(__name__)

ESPERA_INICIAL_SEGUNDOS = 2.0
ESPERA_MINIMA_ABSOLUTA = 0.2
TETO_MAXIMO_SEGUNDOS = 60.0
MARGEM_SEGURANCA_TAXA = 1.5
MARGEM_SEGURANCA_REDE = 1.15
OCORRENCIAS_REDE_PARA_CONFIAR = 3
JANELA_SUCESSOS_PARA_RELAXAR = 15
PASSO_RELAXAMENTO = 0.85


class ThrottleComDescoberta:
    def __init__(self):
        self._espera_atual = ESPERA_INICIAL_SEGUNDOS
        self._nivel_seguro_conhecido = ESPERA_MINIMA_ABSOLUTA
        self._sucessos_consecutivos = 0
        self._erros_taxa_vistos = 0
        self._erros_rede_vistos = 0
        self._timeouts_consecutivos = 0
        self._ultima_chamada = 0.0
        self._trava = threading.Lock()

    def aguardar_vez(self):
        with self._trava:
            agora = time.monotonic()
            decorrido = agora - self._ultima_chamada
            faltam = self._espera_atual - decorrido
            if faltam > 0:
                time.sleep(faltam)
            self._ultima_chamada = time.monotonic()

    def registrar_sucesso(self):
        with self._trava:
            self._timeouts_consecutivos = 0
            self._sucessos_consecutivos += 1
            if self._sucessos_consecutivos >= JANELA_SUCESSOS_PARA_RELAXAR:
                nova_espera = self._espera_atual * PASSO_RELAXAMENTO
                self._espera_atual = max(self._nivel_seguro_conhecido, nova_espera)
                self._sucessos_consecutivos = 0

    def registrar_erro_taxa(self):
        """429/503 -- sinal forte, confia de primeira."""
        with self._trava:
            self._erros_taxa_vistos += 1
            self._timeouts_consecutivos = 0
            self._sucessos_consecutivos = 0
            nivel_com_margem = self._espera_atual * MARGEM_SEGURANCA_TAXA
            self._nivel_seguro_conhecido = max(self._nivel_seguro_conhecido, nivel_com_margem)
            self._espera_atual = min(TETO_MAXIMO_SEGUNDOS, max(self._espera_atual * 2, self._nivel_seguro_conhecido, 5.0))
            logger.warning("erro de taxa (429/503) -- espera=%.1fs nivel_seguro=%.1fs", self._espera_atual, self._nivel_seguro_conhecido)

    def registrar_erro_rede(self):
        """Timeout/conexao pendurada -- sinal ambiguo, so compromete o
        nivel_seguro depois de OCORRENCIAS_REDE_PARA_CONFIAR seguidas."""
        with self._trava:
            self._erros_rede_vistos += 1
            self._sucessos_consecutivos = 0
            self._timeouts_consecutivos += 1
            self._espera_atual = min(TETO_MAXIMO_SEGUNDOS, max(self._espera_atual * 1.5, 5.0))
            if self._timeouts_consecutivos >= OCORRENCIAS_REDE_PARA_CONFIAR:
                nivel_com_margem = self._espera_atual * MARGEM_SEGURANCA_REDE
                self._nivel_seguro_conhecido = max(self._nivel_seguro_conhecido, nivel_com_margem)
            logger.warning("erro de rede/timeout (%d consecutivos) -- espera=%.1fs nivel_seguro=%.1fs",
                            self._timeouts_consecutivos, self._espera_atual, self._nivel_seguro_conhecido)

    @property
    def espera_atual(self):
        return self._espera_atual

    @property
    def nivel_seguro_conhecido(self):
        return self._nivel_seguro_conhecido

    @property
    def erros_taxa_vistos(self):
        return self._erros_taxa_vistos

    @property
    def erros_rede_vistos(self):
        return self._erros_rede_vistos
