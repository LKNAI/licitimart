"""Pipeline de duas etapas (RNF-010/011): localizar citacao candidata ->
validar substring literal -> so entao refinar interpretacao com modelo mais
robusto. ClienteLLM e interface plugavel; ClienteLLMSimulado nao faz
chamada de rede nenhuma e serve so para exercitar o fluxo sem custo/chave.

ClienteLLMReal (rodada 2, 10/09/2026) usa LiteLLM de verdade -- implementado
mesmo sem ANTHROPIC_API_KEY/OPENAI_API_KEY configurada neste ambiente
(decisao explicita do usuario: avancar a implementacao real em vez de
esperar credito de API, contanto que fique marcado com honestidade o que
foi testado). Ate uma chave real ser configurada e rodada contra edital
real, ClienteLLMReal nao tem nenhuma execucao de verdade comprovada --
so revisao de codigo. Nao confundir com validacao.
"""
import json
import os
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


class ClienteLLMReal(ClienteLLM):
    """Cliente real via LiteLLM. Etapa 1 (localizar_citacao) usa Structured
    Outputs (response_format json_object) para garantir a FORMA da
    resposta -- mas, exatamente como RNF-010 exige, a forma nao prova que
    a citacao existe de fato no texto-fonte; por isso o resultado ainda
    passa por citacao_e_valida() em executar_pipeline() antes de qualquer
    interpretacao."""

    def __init__(self, modelo: str | None = None):
        self.modelo = modelo or os.environ.get("LICITIMART_MODELO_LLM", "claude-sonnet-5")

    def localizar_citacao(self, texto_fonte: str, pergunta: str) -> CitacaoCandidata:
        import litellm

        resposta = litellm.completion(
            model=self.modelo,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Encontre no TEXTO-FONTE abaixo o trecho literal que responde à PERGUNTA. "
                        "Copie o trecho EXATAMENTE como aparece no texto-fonte, sem parafrasear, "
                        "sem corrigir e sem alterar nenhum número, data ou valor. Responda em JSON "
                        'com as chaves "trecho" (string) e "pagina" (inteiro; use 1 se não souber).'
                        f"\n\nTEXTO-FONTE:\n{texto_fonte}\n\nPERGUNTA: {pergunta}"
                    ),
                }
            ],
            response_format={"type": "json_object"},
        )
        dados = json.loads(resposta.choices[0].message.content)
        return CitacaoCandidata(trecho=dados["trecho"], pagina=int(dados.get("pagina", 1)))

    def refinar_interpretacao(self, citacao_confirmada: str, pergunta: str) -> str:
        import litellm

        resposta = litellm.completion(
            model=self.modelo,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f'Com base exclusivamente nesta citação confirmada do edital:\n"{citacao_confirmada}"\n\n'
                        f"Responda de forma objetiva: {pergunta}"
                    ),
                }
            ],
        )
        return resposta.choices[0].message.content


def chave_llm_disponivel() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY"))


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


def demonstrar_simulado():
    print("Spike 02 — pipeline de citação validada (modo SIMULADO, sem chave de LLM real)\n")

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


def demonstrar_real():
    print("Spike 02 — pipeline de citação validada (modo REAL — ClienteLLMReal via LiteLLM)\n")
    achado = executar_pipeline(TEXTO_FONTE, "qual o prazo de entrega?", ClienteLLMReal())
    print(f"  citação retornada pelo modelo: {achado.citacao.trecho!r}")
    print(f"  passou na validação de substring literal: {achado.citacao_valida}")
    print(f"  interpretação: {achado.interpretacao}")
    if not achado.citacao_valida:
        print("\n  ATENÇÃO: o modelo real não devolveu a citação literal na primeira tentativa —")
        print("  é exatamente esse tipo de caso que RNF-010/011 existe para pegar antes de exibir ao usuário.")


if __name__ == "__main__":
    import sys

    if "--real" in sys.argv:
        if not chave_llm_disponivel():
            print("ERRO: --real pedido, mas nenhuma ANTHROPIC_API_KEY/OPENAI_API_KEY está configurada.")
            raise SystemExit(1)
        demonstrar_real()
    else:
        demonstrar_simulado()
