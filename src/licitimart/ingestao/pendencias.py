"""Fila de pendencias de reconciliacao, persistente em disco entre execucoes.

Motivo de existir: os spikes 01 (rodadas 2 e 3) provaram duas coisas na
pratica. Primeiro, que pagina abandonada apos esgotar tentativas nao pode
desaparecer -- precisa ficar registrada para retentativa. Segundo -- achado
da rodada 3, ao vivo, contra o PNCP real -- que uma instabilidade do
servidor pode durar mais que uma segunda passada dentro do mesmo processo
(varias modalidades em sequencia sofrendo timeout na mesma janela). Por
isso a fila vive em arquivo, nao em memoria: uma execucao futura (minutos
ou dias depois) pode retomar exatamente o que ficou pendente.
"""
import json
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class Pendencia:
    fonte: str  # ex.: "pncp"
    modalidade: int
    pagina: int
    data_inicial: str
    data_final: str
    motivo: str  # "erro_taxa" | "erro_rede" | "outro"
    primeira_vez_em: str
    tentativas_totais: int = 1

    def chave(self) -> str:
        return f"{self.fonte}:{self.modalidade}:{self.pagina}:{self.data_inicial}:{self.data_final}"


class FilaPendencias:
    """Um arquivo JSON, uma trava de processo. Volume esperado e baixo
    (paginas abandonadas, nao o fluxo normal), entao nao precisa de banco."""

    def __init__(self, caminho: Path):
        self._caminho = caminho
        self._trava = threading.Lock()
        self._caminho.parent.mkdir(parents=True, exist_ok=True)
        if not self._caminho.exists():
            self._escrever({})

    def _ler(self) -> dict:
        if not self._caminho.exists():
            return {}
        conteudo = self._caminho.read_text(encoding="utf-8").strip()
        return json.loads(conteudo) if conteudo else {}

    def _escrever(self, dados: dict):
        self._caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")

    def registrar(self, fonte: str, modalidade: int, pagina: int, data_inicial: str, data_final: str, motivo: str):
        with self._trava:
            dados = self._ler()
            pend = Pendencia(fonte, modalidade, pagina, data_inicial, data_final, motivo,
                              primeira_vez_em=datetime.now(timezone.utc).isoformat())
            chave = pend.chave()
            if chave in dados:
                dados[chave]["tentativas_totais"] += 1
                dados[chave]["motivo"] = motivo
            else:
                dados[chave] = asdict(pend)
            self._escrever(dados)

    def resolver(self, fonte: str, modalidade: int, pagina: int, data_inicial: str, data_final: str):
        with self._trava:
            dados = self._ler()
            chave = f"{fonte}:{modalidade}:{pagina}:{data_inicial}:{data_final}"
            dados.pop(chave, None)
            self._escrever(dados)

    def listar(self, fonte: str | None = None) -> list[Pendencia]:
        with self._trava:
            dados = self._ler()
        pendencias = [Pendencia(**v) for v in dados.values()]
        if fonte:
            pendencias = [p for p in pendencias if p.fonte == fonte]
        return pendencias

    def total(self) -> int:
        return len(self.listar())
