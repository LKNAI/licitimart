"""Spike 03 -- deteccao heuristica de restritividade indevida em clausula de
edital. E um sinal inicial, nao um substituto de analise juridica -- ver
README.md e RN-006 (a funcionalidade de Impugnacao Assistida so pode chegar
a cliente real depois de revisao de advogado, independente deste resultado).

Escrito do zero para este projeto -- nao e copia do codigo de auditoria do
SAU, ainda que a ideia de procurar padrao de restritividade seja a mesma
lente.
"""
import re
from dataclasses import dataclass, field
from typing import Callable, Optional


@dataclass
class Padrao:
    nome: str
    regex: re.Pattern
    explicacao: str
    fundamentacao: str
    # opcional: recebe o match e decide se de fato conta como achado --
    # usado quando o regex por si so nao basta (ex.: percentual acima de
    # um limite legal especifico, nao qualquer percentual).
    validador_extra: Optional[Callable[[re.Match], bool]] = None


PADROES = [
    Padrao(
        nome="marca_especifica_sem_similar",
        regex=re.compile(
            r"\bmarca\s+([A-Z][\wÀ-ú]+)\b(?!.{0,40}(ou\s+similar|ou\s+equivalente|ou\s+de\s+qualidade\s+equivalente))",
            re.IGNORECASE,
        ),
        explicacao="Exige marca específica sem admitir similar/equivalente.",
        fundamentacao="Art. 41, I e art. 7º, §5º da Lei 14.133/2021 — vedação a especificação "
                       "que direcione a marca ou fornecedor específico sem justificativa técnica.",
    ),
    Padrao(
        nome="atestado_percentual_alto",
        regex=re.compile(r"atestado[s]?.{0,60}(\d{2,3})\s*%\s*(do|da)\s+(valor|quantidade)", re.IGNORECASE),
        explicacao="Exige atestado de capacidade técnica em percentual elevado do objeto licitado.",
        fundamentacao="Art. 67, §3º da Lei 14.133/2021 e jurisprudência do TCU — exigência de "
                       "atestado acima de 50% do objeto é indício de restrição indevida à competição, "
                       "salvo justificativa técnica robusta.",
    ),
    Padrao(
        nome="prazo_entrega_curto_incompativel",
        regex=re.compile(r"prazo\s+de\s+entrega.{0,40}\b([1-9])\s*\(?\s*(um|dois|tr[êe]s)?\)?\s*dia[s]?\b", re.IGNORECASE),
        explicacao="Prazo de entrega extremamente curto (poucos dias), possível indício de direcionamento.",
        fundamentacao="Art. 40, X da Lei 14.133/2021 — prazo exíguo pode restringir a competição a "
                       "fornecedor que já detenha estoque prévio, favorecendo incumbente.",
    ),
    Padrao(
        nome="certificacao_exclusiva",
        regex=re.compile(r"certifica[çc][ãa]o\s+exclusiva|certificado\s+emitido\s+exclusivamente", re.IGNORECASE),
        explicacao="Exige certificação emitida por entidade única/exclusiva.",
        fundamentacao="Art. 7º, §5º da Lei 14.133/2021 — exigência de certificação que só um "
                       "fabricante/fornecedor possui é indício de direcionamento.",
    ),
    Padrao(
        nome="registro_uf_especifica",
        regex=re.compile(
            r"registro\s+(no|junto\s+ao)\s+(CREA|CRM|CRQ|CFT)[\/\- ]?([A-Z]{2})\b(?!.{0,40}(qualquer\s+UF|de\s+qualquer\s+estado|em\s+qualquer\s+regi[ãa]o))",
            re.IGNORECASE,
        ),
        explicacao="Exige registro profissional/técnico numa UF específica, sem admitir registro de outra UF com visto.",
        fundamentacao="Art. 7º, §5º e art. 41 da Lei 14.133/2021 — exigir registro de conselho "
                       "profissional restrito a uma UF, sem admitir visto de outro estado, restringe "
                       "a competição a fornecedores locais sem justificativa técnica aparente.",
    ),
    Padrao(
        nome="atestado_unidade_indivisivel",
        regex=re.compile(
            r"atestado[s]?.{0,60}(em\s+um\s+[úu]nico\s+contrato|de\s+uma\s+[úu]nica\s+vez|em\s+uma\s+[úu]nica\s+nota\s+fiscal)",
            re.IGNORECASE,
        ),
        explicacao="Exige que a capacidade técnica seja comprovada de uma só vez (um único contrato/nota), em vez de somar atestados de contratos diferentes.",
        fundamentacao="Súmula 24 do TCU e jurisprudência consolidada — vedar o somatório de atestados "
                       "de execuções distintas para comprovar quantitativo mínimo restringe indevidamente "
                       "a competição, salvo justificativa técnica robusta quanto à indivisibilidade do objeto.",
    ),
    Padrao(
        nome="garantia_proposta_acima_limite",
        regex=re.compile(r"garantia\s+de\s+proposta.{0,40}(\d{1,2})\s*%", re.IGNORECASE),
        explicacao="Exige garantia de proposta em percentual — checar se excede 1% do valor estimado (limite do art. 58, §2º).",
        fundamentacao="Art. 58, §2º da Lei 14.133/2021 — a garantia de proposta não pode exceder "
                       "1% do valor estimado da contratação.",
        validador_extra=lambda m: int(m.group(1)) > 1,
    ),
    Padrao(
        nome="visita_tecnica_obrigatoria_prazo_curto",
        regex=re.compile(
            r"visita\s+t[ée]cnica\s+obrigat[óo]ria.{0,200}prazo\s+de\s+entrega.{0,40}\b([1-9])\s*\(?\s*(um|dois|tr[êe]s)?\)?\s*dia[s]?\b",
            re.IGNORECASE | re.DOTALL,
        ),
        explicacao="Combina visita técnica obrigatória com prazo de entrega muito curto — pode inviabilizar participação de quem não tem presença prévia na região.",
        fundamentacao="Art. 40, X c/c art. 7º, §5º da Lei 14.133/2021 — a combinação de exigências "
                       "que, isoladamente, seriam razoáveis, pode se tornar restritiva quando soma "
                       "barreiras de tempo e logística.",
    ),
]


def detectar(texto: str):
    achados = []
    for padrao in PADROES:
        m = padrao.regex.search(texto)
        if m and padrao.validador_extra is not None and not padrao.validador_extra(m):
            continue
        if m:
            achados.append({
                "padrao": padrao.nome,
                "trecho": m.group(0),
                "explicacao": padrao.explicacao,
                "fundamentacao_candidata": padrao.fundamentacao,
                "aviso": "Candidato a achado — não é conclusão jurídica. Requer revisão humana (RN-006).",
            })
    return achados


CASOS_TESTE = [
    {
        "nome": "restritivo_marca",
        "esperado_disparar": True,
        "texto": "O equipamento ofertado deverá ser da marca Xylotech, modelo XT-500, "
                 "não sendo aceitos produtos de outras marcas.",
    },
    {
        "nome": "restritivo_atestado",
        "esperado_disparar": True,
        "texto": "A empresa deverá comprovar, mediante atestados de capacidade técnica, "
                 "execução de no mínimo 80% do valor total estimado para o item, em contrato único.",
    },
    {
        "nome": "restritivo_prazo",
        "esperado_disparar": True,
        "texto": "O prazo de entrega dos equipamentos será de 3 (três) dias corridos, "
                 "contados da assinatura do contrato.",
    },
    {
        "nome": "controle_marca_com_similar",
        "esperado_disparar": False,
        "texto": "O equipamento ofertado deverá ser da marca Xylotech ou similar/equivalente, "
                 "desde que atenda às especificações técnicas do item.",
    },
    {
        "nome": "controle_atestado_razoavel",
        "esperado_disparar": False,
        "texto": "A empresa deverá comprovar, mediante atestados de capacidade técnica, "
                 "execução de contrato compatível em características com o objeto licitado.",
    },
    {
        "nome": "controle_prazo_razoavel",
        "esperado_disparar": False,
        "texto": "O prazo de entrega dos equipamentos será de 30 (trinta) dias corridos, "
                 "contados da assinatura do contrato.",
    },
    {
        "nome": "restritivo_registro_uf",
        "esperado_disparar": True,
        "texto": "O responsável técnico deverá possuir registro no CREA/SP, sem admitir "
                 "registro de outros estados.",
    },
    {
        "nome": "controle_registro_qualquer_uf",
        "esperado_disparar": False,
        "texto": "O responsável técnico deverá possuir registro no CREA de qualquer UF, "
                 "com visto no conselho local quando aplicável.",
    },
    {
        "nome": "restritivo_atestado_unico",
        "esperado_disparar": True,
        "texto": "A comprovação de capacidade técnica deverá ser feita mediante atestados "
                 "de execução em um único contrato, não sendo aceito o somatório de atestados.",
    },
    {
        "nome": "controle_atestado_somavel",
        "esperado_disparar": False,
        "texto": "A comprovação de capacidade técnica poderá ser feita mediante um ou mais "
                 "atestados, inclusive por somatório de quantitativos de contratos distintos.",
    },
    {
        "nome": "restritivo_garantia_acima_limite",
        "esperado_disparar": True,
        "texto": "Será exigida garantia de proposta correspondente a 3% do valor estimado da contratação.",
    },
    {
        "nome": "controle_garantia_dentro_limite",
        "esperado_disparar": False,
        "texto": "Será exigida garantia de proposta correspondente a 1% do valor estimado da contratação.",
    },
    {
        "nome": "restritivo_visita_prazo_curto",
        "esperado_disparar": True,
        "texto": "A visita técnica obrigatória deverá ser agendada previamente. O prazo de entrega "
                 "dos serviços será de 2 (dois) dias corridos após a assinatura do contrato.",
    },
    {
        "nome": "controle_visita_prazo_razoavel",
        "esperado_disparar": False,
        "texto": "A visita técnica obrigatória deverá ser agendada previamente. O prazo de entrega "
                 "dos serviços será de 30 (trinta) dias corridos após a assinatura do contrato.",
    },
]


def rodar_casos_teste():
    print("Spike 03 — detector heurístico de restritividade\n")
    acertos = 0
    for caso in CASOS_TESTE:
        achados = detectar(caso["texto"])
        disparou = len(achados) > 0
        acertou = disparou == caso["esperado_disparar"]
        acertos += acertou
        status = "OK" if acertou else "FALHOU"
        print(f"[{status}] {caso['nome']}: esperado_disparar={caso['esperado_disparar']} obtido={disparou}")
        for a in achados:
            print(f"       -> padrão '{a['padrao']}': {a['explicacao']}")
    total = len(CASOS_TESTE)
    print(f"\n{acertos}/{total} casos corretos.")
    if acertos == total:
        print("RESULTADO: aprovado como sinal inicial (ver README.md — ainda exige revisão jurídica, RN-006).")
    else:
        print("RESULTADO: sinal fraco/reprovado — ver README.md.")
    return acertos == total


if __name__ == "__main__":
    ok = rodar_casos_teste()
    raise SystemExit(0 if ok else 1)
