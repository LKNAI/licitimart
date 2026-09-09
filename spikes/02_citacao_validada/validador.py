"""Validador de citacao por substring literal (RNF-010).

Normaliza espacos em branco (espaco simples, sem quebra de linha) antes de
comparar -- e so isso. Nao normaliza numero, nao normaliza sinonimo, nao
tenta ser "inteligente" sobre a citacao: qualquer normalizacao alem de
espacamento reabre a porta para aceitar citacao alterada como valida, que e
exatamente o que este validador existe para impedir.
"""
import re


def _normalizar_espacos(texto: str) -> str:
    return re.sub(r"\s+", " ", texto).strip()


def citacao_e_valida(texto_fonte: str, citacao_candidata: str) -> bool:
    """True somente se a citacao aparece literalmente no texto-fonte,
    tolerando apenas diferenca de espacamento/quebra de linha."""
    fonte_normalizada = _normalizar_espacos(texto_fonte)
    citacao_normalizada = _normalizar_espacos(citacao_candidata)
    if not citacao_normalizada:
        return False
    return citacao_normalizada in fonte_normalizada


CASOS_TESTE = [
    {
        "nome": "identica",
        "esperado": True,
        "descricao": "citação exatamente igual a um trecho do texto-fonte",
    },
    {
        "nome": "espacamento_diferente",
        "esperado": True,
        "descricao": "mesma citação, mas com quebra de linha/espaço duplo no meio",
    },
    {
        "nome": "parafraseada",
        "esperado": False,
        "descricao": "mesma ideia, palavras diferentes — não é substring, deve reprovar",
    },
    {
        "nome": "numero_alterado",
        "esperado": False,
        "descricao": "citação quase idêntica, mas com um valor numérico trocado — "
                     "o caso mais perigoso de alucinação sutil, deve reprovar",
    },
]

TEXTO_FONTE = (
    "CLÁUSULA 7.2 — O prazo de entrega dos equipamentos será de 30 (trinta) dias corridos "
    "contados a partir da assinatura do contrato, sob pena de multa de 2% (dois por cento) "
    "sobre o valor total do item em atraso, por dia de descumprimento."
)

CITACOES_CANDIDATAS = {
    "identica": "O prazo de entrega dos equipamentos será de 30 (trinta) dias corridos",
    "espacamento_diferente": "O prazo de entrega dos equipamentos será de 30 (trinta)\n  dias corridos",
    "parafraseada": "Os equipamentos devem ser entregues em até um mês após a assinatura",
    "numero_alterado": "O prazo de entrega dos equipamentos será de 60 (sessenta) dias corridos",
}


def rodar_casos_teste():
    print("Spike 02 — validador de citação por substring literal\n")
    todos_passaram = True
    for caso in CASOS_TESTE:
        nome = caso["nome"]
        citacao = CITACOES_CANDIDATAS[nome]
        resultado = citacao_e_valida(TEXTO_FONTE, citacao)
        passou = resultado == caso["esperado"]
        todos_passaram &= passou
        status = "OK" if passou else "FALHOU"
        print(f"[{status}] {nome}: esperado={caso['esperado']} obtido={resultado}")
        print(f"       {caso['descricao']}")
    print()
    if todos_passaram:
        print("RESULTADO: aprovado — validador rejeita paráfrase e número alterado corretamente.")
    else:
        print("RESULTADO: reprovado crítico — ver README.md, seção de critério de aprovação.")
    return todos_passaram


if __name__ == "__main__":
    ok = rodar_casos_teste()
    raise SystemExit(0 if ok else 1)
