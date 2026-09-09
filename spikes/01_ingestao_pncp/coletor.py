"""Spike 01 (rodada 3) -- varre /contratacoes/publicacao nacionalmente,
iterando pelas modalidades obrigatorias, com throttle de descoberta empirica
que distingue sinal forte (429/503) de sinal ambiguo (timeout/hang) -- ver
throttle.py e plan.md desta rodada.

Correcoes desta rodada em relacao a rodada 2 (ver resultados/resumo.md da
rodada 2 para o porque):
1. Erro de rede (timeout) chamava throttle.registrar_erro_taxa() por engano
   -- tratava conexao pendurada com a mesma confianca de um 429 real. Agora
   chama throttle.registrar_erro_rede(), que so compromete o nivel_seguro
   apos ocorrencias consecutivas (ver throttle.py).
2. Pagina abandonada apos esgotar tentativas NAO desaparece mais -- entra
   numa lista de pendencias, revisitada numa segunda passada ao fim da
   varredura normal, se sobrar orcamento de tempo. Se ainda assim nao for
   resolvida, fica marcada de forma visivel no resumo -- nunca escondida
   atras de "cobertura completa".
"""
import argparse
import functools
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

print = functools.partial(print, flush=True)  # sem isso, saida so aparece no fim do processo

sys.path.insert(0, str(Path(__file__).parent))
from throttle import ThrottleComDescoberta

BASE_URL = "https://pncp.gov.br/api/consulta/v1"
TAMANHO_PAGINA = 50
MAX_PAGINAS_POR_MODALIDADE = 200  # trava de seguranca contra loop infinito, nao contra volume real
MAX_TENTATIVAS_POR_PAGINA = 6  # depois disso, abandona a pagina em vez de retry infinito
TIMEOUT_CLIENTE_SEGUNDOS = 8.0

# codigoModalidadeContratacao e obrigatorio nesse endpoint (achado da rodada
# 1 -- nao ha chamada "sem filtro de modalidade" possivel). Codigos 1 a 13
# sondados manualmente; 2 e 3 responderam 204 no dia sondado (modalidade
# valida, sem resultado naquele dia -- nao e o mesmo que codigo invalido).
MODALIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
ORCAMENTO_TOTAL_SEGUNDOS_PADRAO = 900  # 15 min -- rodada 2 provou que as 13 modalidades cabem bem antes disso


def coletar(data_inicial: str, data_final: str, resultados_dir: Path, orcamento_segundos: int):
    throttle = ThrottleComDescoberta()
    cliente = httpx.Client(timeout=TIMEOUT_CLIENTE_SEGUNDOS)
    registros = []
    total_registros_informado = None
    pendencias = []  # lista de (modalidade, pagina) abandonadas na varredura normal
    inicio = time.monotonic()

    resultados_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    raw_path = resultados_dir / f"raw_{ts}.jsonl"
    raw_file = raw_path.open("w", encoding="utf-8")

    def gravar(registro):
        registros.append(registro)
        raw_file.write(json.dumps(registro, ensure_ascii=False) + "\n")
        raw_file.flush()

    def orcamento_restante():
        return orcamento_segundos - (time.monotonic() - inicio)

    def tentar_pagina(modalidade, pagina, segunda_passada=False):
        """Tenta coletar uma pagina ate MAX_TENTATIVAS_POR_PAGINA vezes.
        Retorna ('sucesso', itens) | ('fim_modalidade', None) | ('abandonada', None)."""
        nonlocal total_registros_informado
        tentativas = 0
        while tentativas < MAX_TENTATIVAS_POR_PAGINA:
            tentativas += 1
            throttle.aguardar_vez()
            t0 = time.monotonic()
            params = {
                "dataInicial": data_inicial,
                "dataFinal": data_final,
                "codigoModalidadeContratacao": modalidade,
                "pagina": pagina,
                "tamanhoPagina": TAMANHO_PAGINA,
            }
            prefixo = f"[mod {modalidade} pag {pagina} tent {tentativas}{' (2a passada)' if segunda_passada else ''}]"
            try:
                resp = cliente.get(f"{BASE_URL}/contratacoes/publicacao", params=params)
                latencia = time.monotonic() - t0
            except httpx.RequestError as exc:
                latencia = time.monotonic() - t0
                gravar({
                    "modalidade": modalidade, "pagina": pagina, "tentativa": tentativas,
                    "segunda_passada": segunda_passada, "status": None, "erro": str(exc),
                    "latencia_s": round(latencia, 3), "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                throttle.registrar_erro_rede()
                print(f"{prefixo} ERRO DE REDE/HANG: {exc} -- espera subiu para {throttle.espera_atual:.1f}s "
                      f"(nível seguro: {throttle.nivel_seguro_conhecido:.1f}s)")
                continue

            status = resp.status_code
            registro = {
                "modalidade": modalidade, "pagina": pagina, "tentativa": tentativas,
                "segunda_passada": segunda_passada, "status": status, "latencia_s": round(latencia, 3),
                "tamanho_bytes": len(resp.content), "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            if status == 200:
                corpo = resp.json()
                itens = corpo.get("data", []) if isinstance(corpo, dict) else []
                total_registros_informado = resp.headers.get("total-registros") or total_registros_informado
                registro["itens_na_pagina"] = len(itens)
                throttle.registrar_sucesso()
                gravar(registro)
                print(f"{prefixo} 200 -- {len(itens)} itens -- {latencia:.2f}s -- espera={throttle.espera_atual:.2f}s")
                return ("sucesso", itens)
            elif status == 204:
                registro["itens_na_pagina"] = 0
                gravar(registro)
                print(f"{prefixo} 204 -- sem resultado para esta modalidade/janela")
                return ("fim_modalidade", None)
            elif status in (429, 503):
                throttle.registrar_erro_taxa()
                gravar(registro)
                print(f"{prefixo} {status} -- espera subiu para {throttle.espera_atual:.1f}s "
                      f"(nível seguro: {throttle.nivel_seguro_conhecido:.1f}s)")
                continue
            else:
                gravar(registro)
                print(f"{prefixo} status inesperado {status} -- {resp.text[:200]}")
                return ("fim_modalidade", None)

        return ("abandonada", None)

    # --- varredura normal ---
    orcamento_esgotado = False
    for modalidade in MODALIDADES:
        if orcamento_esgotado:
            break
        pagina = 1
        while pagina <= MAX_PAGINAS_POR_MODALIDADE:
            if orcamento_restante() <= 0:
                print(f"[orçamento de tempo esgotado — {orcamento_segundos}s — parando aqui, não é falha, é limite deliberado do spike]")
                orcamento_esgotado = True
                break

            resultado, itens = tentar_pagina(modalidade, pagina)
            if resultado == "sucesso":
                if len(itens) == 0:
                    break
                pagina += 1
            elif resultado == "fim_modalidade":
                break
            else:  # abandonada
                gravar({
                    "modalidade": modalidade, "pagina": pagina, "pendente_reconciliacao": True,
                    "abandonada_apos_tentativas": MAX_TENTATIVAS_POR_PAGINA, "segunda_passada": False,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                pendencias.append((modalidade, pagina))
                print(f"[mod {modalidade} pag {pagina}] ABANDONADA após {MAX_TENTATIVAS_POR_PAGINA} tentativas "
                      f"-- marcada pendente_reconciliacao, seguindo para próxima modalidade")
                break

    # --- segunda passada sobre pendencias, so se sobrar orcamento ---
    pendencias_resolvidas = []
    pendencias_persistentes = []
    if pendencias and orcamento_restante() > 0:
        print(f"[segunda passada -- revisitando {len(pendencias)} pendência(s), orçamento restante: {orcamento_restante():.0f}s]")
        for modalidade, pagina in pendencias:
            if orcamento_restante() <= 0:
                print("[orçamento esgotado antes de concluir a segunda passada]")
                pendencias_persistentes.extend(
                    (m, p) for m, p in pendencias if (m, p) not in pendencias_resolvidas and (m, p) not in pendencias_persistentes
                )
                break
            resultado, _ = tentar_pagina(modalidade, pagina, segunda_passada=True)
            if resultado == "sucesso":
                pendencias_resolvidas.append((modalidade, pagina))
                gravar({
                    "modalidade": modalidade, "pagina": pagina, "pendencia_resolvida_na_segunda_passada": True,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            else:
                pendencias_persistentes.append((modalidade, pagina))
                gravar({
                    "modalidade": modalidade, "pagina": pagina, "pendente_reconciliacao": True,
                    "persistente_apos_segunda_passada": True, "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    else:
        pendencias_persistentes = list(pendencias)

    duracao_total = time.monotonic() - inicio
    cliente.close()
    raw_file.close()
    print(f"[bruto gravado incrementalmente em {raw_path.name}]")

    escrever_resumo(resultados_dir, registros, duracao_total, data_inicial, data_final,
                     total_registros_informado, throttle, pendencias, pendencias_resolvidas, pendencias_persistentes)
    return registros


def escrever_resumo(resultados_dir, registros, duracao_total, data_inicial, data_final,
                     total_registros_informado, throttle, pendencias, pendencias_resolvidas, pendencias_persistentes):
    sucesso = [r for r in registros if r.get("status") == 200]
    erros_taxa = [r for r in registros if r.get("status") in (429, 503)]
    erros_rede = [r for r in registros if r.get("erro")]
    modalidades_cobertas = sorted(set(r["modalidade"] for r in registros if "modalidade" in r))
    latencias = [r["latencia_s"] for r in sucesso]
    total_itens = sum(r.get("itens_na_pagina", 0) for r in sucesso)

    latencia_media = sum(latencias) / len(latencias) if latencias else 0
    itens_por_pagina_media = total_itens / len(sucesso) if sucesso else 0

    descoberta_valida = throttle.erros_taxa_vistos > 0 or throttle.erros_rede_vistos > 0
    seg_por_dia = 24 * 3600
    espera_sustentavel = max(throttle.nivel_seguro_conhecido, 0.05)
    paginas_por_dia_sustentavel = seg_por_dia / espera_sustentavel
    volume_diario_extrapolado = int(paginas_por_dia_sustentavel * itens_por_pagina_media)

    linhas = [
        f"# Resumo — spike 01, rodada 3 (janela {data_inicial} a {data_final})",
        "",
        f"- Requisições feitas: {len(registros)}",
        f"- Sucesso (200): {len(sucesso)}",
        f"- Erros de rate limit (429/503): {len(erros_taxa)}",
        f"- Erros de rede/timeout: {len(erros_rede)}",
        f"- Modalidades cobertas nesta execução: {modalidades_cobertas} (de {MODALIDADES})",
        f"- Itens coletados nesta janela: {total_itens}",
        f"- Total informado pelo cabeçalho da API (se disponível): {total_registros_informado}",
        f"- Latência média por requisição bem-sucedida: {latencia_media:.2f}s",
        f"- Duração total do spike: {duracao_total:.1f}s",
        "",
        "## Pendências (nunca omitidas — se zero, diz isso explicitamente)",
    ]
    if not pendencias:
        linhas.append("- Nenhuma página foi abandonada nesta execução. Zero pendência.")
    else:
        linhas.append(f"- {len(pendencias)} página(s) abandonada(s) na varredura normal: {pendencias}")
        linhas.append(f"- {len(pendencias_resolvidas)} resolvida(s) na segunda passada: {pendencias_resolvidas}")
        if pendencias_persistentes:
            linhas.append(f"- **{len(pendencias_persistentes)} AINDA PENDENTE(S) mesmo após a segunda passada — dado não coletado nesta execução: {pendencias_persistentes}**")
        else:
            linhas.append("- Nenhuma pendência restante — a segunda passada resolveu todas.")

    linhas += [
        "",
        "## Nível seguro descoberto nesta execução (não herdado do SAU)",
        f"- Nível seguro conhecido ao final: {throttle.nivel_seguro_conhecido:.2f}s",
        f"- Espera em uso ao final: {throttle.espera_atual:.2f}s",
        f"- Erros de taxa (429/503) vistos: {throttle.erros_taxa_vistos}",
        f"- Erros de rede/timeout vistos: {throttle.erros_rede_vistos}",
        "",
        "## Extrapolação baseada no nível seguro descoberto",
    ]
    if descoberta_valida:
        linhas += [
            f"- Média de itens por página: {itens_por_pagina_media:.1f}",
            f"- Páginas possíveis em 24h no espaçamento seguro descoberto ({espera_sustentavel:.2f}s): {paginas_por_dia_sustentavel:.0f}",
            f"- Volume diário extrapolado (limite superior teórico, sem paralelismo): ~{volume_diario_extrapolado} contratações/dia",
        ]
    else:
        linhas += [
            "- NÃO DISPONÍVEL: esta execução não viu nenhum erro (nem de taxa, nem de rede), então o "
            "\"nível seguro conhecido\" acima é só o piso absoluto default, não algo descoberto contra "
            "o servidor real.",
        ]
    linhas += [
        "",
        "## Leitura",
        "Preencher manualmente após rodar: aprovado / reprovado parcial / reprovado, "
        "conforme critério do README.md, e a ação decorrente para src/licitimart/ingestao/.",
    ]
    (resultados_dir / "resumo.md").write_text("\n".join(linhas), encoding="utf-8")
    print("\n".join(linhas))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-inicial", required=True, help="AAAAMMDD")
    parser.add_argument("--data-final", required=True, help="AAAAMMDD")
    parser.add_argument("--orcamento-segundos", type=int, default=ORCAMENTO_TOTAL_SEGUNDOS_PADRAO)
    args = parser.parse_args()

    destino = Path(__file__).parent / "resultados"
    coletar(args.data_inicial, args.data_final, destino, args.orcamento_segundos)
