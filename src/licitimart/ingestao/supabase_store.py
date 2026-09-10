"""Escrita real no Supabase, usando a service_role key (ignora RLS -- e
o papel certo para um processo de backend, nunca para o browser).

Nunca loga nem inclui a chave em mensagem de erro -- so confirma presenca/
ausencia da variavel de ambiente.
"""
import hashlib
import json
import os
from datetime import datetime

from supabase import Client, create_client


def _exigir_env(nome: str) -> str:
    valor = os.environ.get(nome)
    if not valor:
        raise RuntimeError(
            f"Variável de ambiente {nome} não configurada. Crie um .env na raiz do projeto "
            f"(gitignored) com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY -- nunca cole a chave no chat."
        )
    return valor


def criar_cliente() -> Client:
    url = _exigir_env("SUPABASE_URL").rstrip("/")
    chave = _exigir_env("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, chave)


# Campos que participam da deteccao de retificacao (RF-018) -- so os que
# de fato vem da API do PNCP e podem mudar entre duas coletas do mesmo
# edital. Precisa bater com o check constraint de retificacoes.campo.
_CAMPOS_COMPARAVEIS = ("orgao", "municipio_uf", "objeto", "modalidade", "valor_estimado", "data_publicacao")


def _normalizar_para_comparacao(campo: str, valor):
    """O Postgres devolve valor_estimado como float/Decimal e
    data_publicacao com timezone explicito (+00:00), mesmo quando o PNCP
    manda o numero "cru" e a data sem timezone -- comparar as strings
    brutas gera falso-positivo de retificacao (mesmo valor, representacao
    diferente). Normaliza para o tipo comparavel antes do == ."""
    if valor is None:
        return None
    if campo == "valor_estimado":
        try:
            return float(valor)
        except (TypeError, ValueError):
            return valor
    if campo == "data_publicacao":
        try:
            dt = datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
        except ValueError:
            return valor
        # Comparar sempre "naive" -- o PNCP manda sem timezone e o
        # Postgres devolve com +00:00; == entre aware e naive nunca da
        # True (nao lanca erro, so nunca bate), o que gerava
        # falso-positivo de retificacao para o mesmo instante.
        return dt.replace(tzinfo=None) if dt.tzinfo else dt
    return valor


def _detectar_retificacoes(linhas_novas: list[dict], linhas_antigas_por_numero: dict[str, dict]) -> list[dict]:
    """Compara cada linha nova contra o estado atual (antes do upsert
    sobrescrever) e retorna uma linha de retificacoes por campo que
    mudou. Primeira coleta de um numero_controle_pncp (sem linha antiga)
    nunca gera retificacao -- e publicacao, nao alteracao."""
    retificacoes = []
    for nova in linhas_novas:
        antiga = linhas_antigas_por_numero.get(nova["numero_controle_pncp"])
        if not antiga:
            continue
        for campo in _CAMPOS_COMPARAVEIS:
            valor_antigo = antiga.get(campo)
            valor_novo = nova.get(campo)
            if _normalizar_para_comparacao(campo, valor_antigo) == _normalizar_para_comparacao(campo, valor_novo):
                continue
            retificacoes.append({
                "contratacao_id": antiga["id"],
                "numero_controle_pncp": nova["numero_controle_pncp"],
                "campo": campo,
                "valor_anterior": str(valor_antigo) if valor_antigo is not None else None,
                "valor_novo": str(valor_novo) if valor_novo is not None else None,
            })
    return retificacoes


def upsert_contratacoes(cliente: Client, itens_pncp: list[dict]) -> int:
    """Recebe itens crus da API do PNCP (mesmo formato de pncp.py) e faz
    upsert por numero_controle_pncp (chave unica do schema) -- rodar o
    coletor de novo sobre o mesmo dia nunca duplica linha.

    Antes de sobrescrever, busca o estado atual de cada numero_controle_pncp
    do lote e compara campo a campo (RF-018) -- e a unica janela em que o
    "antes" ainda existe; depois do upsert, so o "depois" sobrevive."""
    linhas = []
    for item in itens_pncp:
        numero = item.get("numeroControlePNCP")
        if not numero:
            continue
        orgao_entidade = item.get("orgaoEntidade") or {}
        unidade = item.get("unidadeOrgao") or {}
        linhas.append({
            "numero_controle_pncp": numero,
            "fonte": "pncp",
            "orgao": orgao_entidade.get("razaoSocial"),
            "municipio_uf": f"{unidade.get('municipioNome')}/{unidade.get('ufSigla')}",
            "objeto": item.get("objetoCompra"),
            "modalidade": item.get("modalidadeNome"),
            "valor_estimado": item.get("valorTotalEstimado"),
            "data_publicacao": item.get("dataPublicacaoPncp"),
            "confiabilidade": "fonte_unica",
        })
    if not linhas:
        return 0

    numeros = [l["numero_controle_pncp"] for l in linhas]
    resposta_antigas = (
        cliente.table("contratacoes")
        .select("id,numero_controle_pncp,orgao,municipio_uf,objeto,modalidade,valor_estimado,data_publicacao")
        .in_("numero_controle_pncp", numeros)
        .execute()
    )
    antigas_por_numero = {r["numero_controle_pncp"]: r for r in resposta_antigas.data}

    retificacoes = _detectar_retificacoes(linhas, antigas_por_numero)
    if retificacoes:
        cliente.table("retificacoes").insert(retificacoes).execute()

    cliente.table("contratacoes").upsert(linhas, on_conflict="numero_controle_pncp").execute()
    return len(linhas)


def upsert_itens_licitacao(cliente: Client, contratacao_id: int, itens_pncp: list[dict]) -> int:
    """Itens (RF-008) nao entram no rastreamento de retificacao desta fase
    (so contratacoes tem historico, ver Fase H) -- delete-then-insert por
    contratacao_id substitui o estado em vez de versionar. Mais simples, e
    item raramente muda sozinho sem o resto do edital mudar junto."""
    cliente.table("itens_licitacao").delete().eq("contratacao_id", contratacao_id).execute()
    if not itens_pncp:
        return 0
    linhas = [{
        "contratacao_id": contratacao_id,
        "descricao": item.get("descricao") or "(sem descrição)",
        "quantidade": item.get("quantidade"),
        "valor_unitario_estimado": item.get("valorUnitarioEstimado"),
    } for item in itens_pncp]
    cliente.table("itens_licitacao").insert(linhas).execute()
    return len(linhas)


BUCKET_DOCUMENTOS = "editais-documentos"


def salvar_documento(
    cliente: Client,
    contratacao_id: int,
    numero_controle_pncp: str,
    sequencial_documento: int,
    titulo: str,
    tipo_documento: str,
    conteudo: bytes,
    texto_extraido: str,
    status_extracao: str,
    paginas: int,
) -> None:
    """Upload no Storage + upsert em documentos_contratacao. Path
    prefixado por numero_controle_pncp -- legivel, sem colisao entre
    contratacoes diferentes."""
    caminho = f"{numero_controle_pncp}/{sequencial_documento}_{titulo}"
    cliente.storage.from_(BUCKET_DOCUMENTOS).upload(
        caminho, conteudo, {"upsert": "true", "content-type": "application/octet-stream"}
    )
    cliente.table("documentos_contratacao").upsert({
        "contratacao_id": contratacao_id,
        "sequencial_documento": sequencial_documento,
        "titulo": titulo,
        "tipo_documento": tipo_documento,
        "storage_path": caminho,
        "texto_extraido": texto_extraido or None,
        "status_extracao": status_extracao,
        "paginas": paginas or None,
    }, on_conflict="contratacao_id,sequencial_documento").execute()


def registrar_manifesto(cliente: Client, fonte: str, consulta: dict, contagem: int) -> None:
    """RNF-013 -- procedencia de cada lote de coleta. sha256 calculado
    sobre a propria consulta+contagem (nao sobre o payload bruto completo,
    que nao guardamos aqui) -- serve para provar "esta consulta, feita
    nesta janela, trouxe esta contagem", nao para verificar integridade
    byte a byte do payload."""
    assinatura = hashlib.sha256(json.dumps({"consulta": consulta, "contagem": contagem}, sort_keys=True).encode()).hexdigest()
    cliente.table("manifestos_ingestao").insert({
        "fonte": fonte,
        "consulta": consulta,
        "contagem": contagem,
        "sha256": assinatura,
    }).execute()


def sincronizar_pendencias(cliente: Client, pendencias: list) -> int:
    """Espelha a FilaPendencias local (JSON) na tabela -- visibilidade do
    Admin Licitimart (PU-05) sobre a saude dos conectores. Sem chave unica
    no schema para pendencia (fonte+modalidade+pagina+data se repete entre
    execucoes) -- por simplicidade, cada chamada insere so o estado atual
    conhecido, sem tentar deduplicar contra o historico ja gravado."""
    if not pendencias:
        return 0
    linhas = [{
        "fonte": p.fonte,
        "modalidade": p.modalidade,
        "pagina": p.pagina,
        "data_inicial": p.data_inicial,
        "data_final": p.data_final,
        "motivo": p.motivo,
        "tentativas_totais": p.tentativas_totais,
    } for p in pendencias]
    cliente.table("pendencias_ingestao").insert(linhas).execute()
    return len(linhas)
