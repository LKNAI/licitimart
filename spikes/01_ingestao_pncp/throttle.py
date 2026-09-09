"""Limitador de taxa com descoberta empirica da margem segura.

Revisao pos-rodada-1 (ver resultados/resumo.md): um piso fixo de 0,35s
copiado do SAU nao se sustentou aqui -- o servidor limitou a taxa depois de
so ~8 chamadas sequenciais, varrendo varias modalidades na mesma janela. Em
vez de assumir um piso fixo entre execucoes, este throttle:

1. Comeca conservador (ESPERA_INICIAL) e tenta relaxar aos poucos.
2. Na primeira vez que ve 429/503 (sinal FORTE de rate limit), registra a
   espera em que o erro aconteceu e fixa um "nivel_seguro" com margem de
   seguranca por cima dela -- e nunca mais relaxa abaixo desse nivel nesta
   execucao, mesmo sob sucesso prolongado.
3. So volta a tentar relaxar rumo ao nivel_seguro (nunca abaixo dele) apos
   uma janela grande de sucessos consecutivos.

Revisao pos-rodada-2: conexao pendurada (timeout de rede) e um sinal
AMBIGUO -- pode nao ter nada a ver com taxa de chamada (proxy, instabilidade
pontual do servidor). A rodada 2 tratava timeout com a mesma confianca de um
429 e isso empurrou o nivel_seguro para 90s, bem mais pessimista que o
regime real sustentado (7,5-10s). Agora:

- 429/503 sobe o nivel_seguro imediatamente, margem MARGEM_SEGURANCA_TAXA.
- timeout de rede so sobe o nivel_seguro depois de OCORRENCIAS_REDE_PARA_CONFIAR
  ocorrencias CONSECUTIVAS (nao esporadicas), com margem menor
  (MARGEM_SEGURANCA_REDE) -- uma unica conexao pendurada isolada nao
  compromete a taxa aprendida para o resto da execucao.
"""
import time
import threading

ESPERA_INICIAL_SEGUNDOS = 2.0
ESPERA_MINIMA_ABSOLUTA = 0.2  # nunca relaxa abaixo disso, mesmo sem erro visto ainda
TETO_MAXIMO_SEGUNDOS = 60.0
MARGEM_SEGURANCA_TAXA = 1.5  # sinal forte (429/503) -- confia de primeira
MARGEM_SEGURANCA_REDE = 1.15  # sinal ambiguo (timeout) -- confia pouco
OCORRENCIAS_REDE_PARA_CONFIAR = 3  # so compromete nivel_seguro apos N timeouts CONSECUTIVOS
JANELA_SUCESSOS_PARA_RELAXAR = 15
PASSO_RELAXAMENTO = 0.85  # multiplicativo -- relaxa devagar, nunca abaixo do nivel_seguro conhecido


class ThrottleComDescoberta:
    def __init__(self):
        self._espera_atual = ESPERA_INICIAL_SEGUNDOS
        self._nivel_seguro_conhecido = ESPERA_MINIMA_ABSOLUTA  # ate ver erro, so o minimo absoluto
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
            self._timeouts_consecutivos = 0  # sucesso quebra a sequencia de timeouts
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

    def registrar_erro_rede(self):
        """Timeout/conexao pendurada -- sinal ambiguo, so compromete o
        nivel_seguro depois de OCORRENCIAS_REDE_PARA_CONFIAR seguidas."""
        with self._trava:
            self._erros_rede_vistos += 1
            self._sucessos_consecutivos = 0
            self._timeouts_consecutivos += 1
            # sempre reage no curto prazo (espera_atual sobe), mesmo sem
            # confiar ainda no sinal para o nivel_seguro de longo prazo
            self._espera_atual = min(TETO_MAXIMO_SEGUNDOS, max(self._espera_atual * 1.5, 5.0))
            if self._timeouts_consecutivos >= OCORRENCIAS_REDE_PARA_CONFIAR:
                nivel_com_margem = self._espera_atual * MARGEM_SEGURANCA_REDE
                self._nivel_seguro_conhecido = max(self._nivel_seguro_conhecido, nivel_com_margem)

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
