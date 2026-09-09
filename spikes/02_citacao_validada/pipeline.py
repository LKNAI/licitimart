"""Pipeline de duas etapas (RNF-010/011): localizar citacao candidata ->
validar substring literal -> so entao refinar interpretacao com modelo mais
robusto. ClienteLLM e interface plugavel; ClienteLLMSimulado nao faz
chamada de rede nenhuma e serve so para exercitar o fluxo sem custo/chave.

Para testar com LLM real: implementar ClienteLLMReal usando
ANTHROPIC_API_KEY ou OPENAI_API_KEY (nao configurada neste ambiente) e
trocar a instanciacao em __main__.
"""
from dataclasses import dataclass
from validador import citacao_e_valida


@dataclass
class CitacaoCandidata:
    trecho: str
    pagina: int


@dataclass
class Achado:
    citacao: CitacaoCandidata
    citacao_valida: bool
    interpretacao: str | None


class ClienteLLM:
    def localizar_citacao(self, texto_fonte: str, pergunta: str) -> CitacaoCandidata:
        raise NotImplementedError

    def refinar_interpretacao(self, citacao_confirmada: str, pergunta: str) -> str:
        raise NotImplementedError


class ClienteLLMSimulado(ClienteLLM):
    """Simula um modelo barato que ora acerta a citação literal, ora
    (deliberadamente) devolve uma versão levemente alterada -- para o
    pipeline exercitar o caminho de rejeição, não só o caminho feliz."""

    def __init__(self, forcar_alucinacao: bool = False):
        self.forcar_alucinacao = forcar_alucinacao

    def localizar_citacao(self, texto_fonte: str, pergunta: str) -> CitacaoCandidata:
        trecho_real = "O prazo de entrega dos equipamentos será de 30 (trinta) dias corridos"
        if self.forcar_alucinacao:
            trecho_real = trecho_real.replace("30 (trinta)", "45 (quarenta e cinco)")
        return CitacaoCandidata(trecho=trecho_real, pagina=3)

    def refinar_interpretacao(self, citacao_confirmada: str, pergunta: str) -> str:
        return f"Interpretação (modelo robusto simulado) sobre: \"{citacao_confirmada}\""


def executar_pipeline(texto_fonte: str, pergunta: str, cliente: ClienteLLM) -> Achado:
    candidata = cliente.localizar_citacao(texto_fonte, pergunta)
    valida = citacao_e_valida(texto_fonte, candidata.trecho)

    if not valida:
        return Achado(citacao=candidata, citacao_valida=False, interpretacao=None)

    interpretacao = cliente.refinar_interpretacao(candidata.trecho, pergunta)
    return Achado(citacao=candidata, citacao_valida=True, interpretacao=interpretacao)


TEXTO_FONTE = (
    "CLÁUSULA 7.2 — O prazo de entrega dos equipamentos será de 30 (trinta) dias corridos "
    "contados a partir da assinatura do contrato, sob pena de multa de 2% (dois por cento) "
    "sobre o valor total do item em atraso, por dia de descumprimento."
)


def demonstrar():
    print("Spike 02 — pipeline de citação validada (modo simulado, sem chave de LLM)\n")

    print("Caso 1 — modelo simulado devolve citação correta:")
    achado = executar_pipeline(TEXTO_FONTE, "qual o prazo de entrega?", ClienteLLMSimulado())
    print(f"  citação: {achado.citacao.trecho!r}")
    print(f"  válida: {achado.citacao_valida}")
    print(f"  interpretação: {achado.interpretacao}\n")

    print("Caso 2 — modelo simulado devolve citação com número alterado (alucinação forçada):")
    achado = executar_pipeline(TEXTO_FONTE, "qual o prazo de entrega?", ClienteLLMSimulado(forcar_alucinacao=True))
    print(f"  citação: {achado.citacao.trecho!r}")
    print(f"  válida: {achado.citacao_valida}")
    print(f"  interpretação: {achado.interpretacao}")
    print("  -> o pipeline corretamente descarta a citação e nunca chega a interpretá-la.\n")

    print("PENDENTE: rodar este mesmo pipeline com ClienteLLMReal contra edital real,")
    print("assim que ANTHROPIC_API_KEY ou OPENAI_API_KEY estiver configurada neste ambiente.")


if __name__ == "__main__":
    demonstrar()
