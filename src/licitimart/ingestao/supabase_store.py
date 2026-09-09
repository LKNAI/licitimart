"""Escrita real no Supabase, usando a service_role key (ignora RLS -- e
o papel certo para um processo de backend, nunca para o browser).

Nunca loga nem inclui a chave em mensagem de erro -- so confirma presenca/
ausencia da variavel de ambiente.
"""
import hashlib
import json
import os

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


def upsert_contratacoes(cliente: Client, itens_pncp: list[dict]) -> int:
    """Recebe itens crus da API do PNCP (mesmo formato de pncp.py) e faz
    upsert por numero_controle_pncp (chave unica do schema) -- rodar o
    coletor de novo sobre o mesmo dia nunca duplica linha."""
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
    cliente.table("contratacoes").upsert(linhas, on_conflict="numero_controle_pncp").execute()
    return len(linhas)


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
