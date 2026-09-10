# Plan: Fase N — Varredura nacional de metadados + enriquecimento sob demanda

Escrito antes do código. Nona fase da sequência.

## Problema

A ferramenta hoje tem só 248 contratações, coletadas com `data_inicial=data_final=20260908` (1 dia) e `modalidades=[1,4,5]` (3 de 13) — um smoke test, não uma base útil. Para o produto fazer sentido como radar (triagem ampla, depois investigação sob demanda), a camada de metadado — barata, um GET paginado por modalidade/data — precisa cobrir a base nacional inteira. Itens/documentos/análise LLM — caros, N+1 por contratação — não devem ser pré-computados em lote para 100% da base; só fazem sentido quando um usuário abre uma contratação específica.

## Decisão de escopo

1. **Varredura de metadados: toda a base histórica do PNCP**, não uma janela recente. Ponto de partida assumido: `20210101` (ano da Lei 14.133/2021, que criou o PNCP) — não confirmado como a data exata do primeiro registro, então o scanner não assume isso como verdade fixa: um mês sem nenhum resultado (fim_modalidade na página 1) é só pulado, barato, sem erro. Fim: hoje.
2. **Chunking mensal, não uma chamada com o intervalo inteiro.** `MAX_PAGINAS_POR_MODALIDADE=200` × `TAMANHO_PAGINA=50` = teto de 10.000 resultados por chamada de `coletar_dia`. Modalidades de alto volume (ex. Pregão Eletrônico) podem passar disso num intervalo de anos — silenciosamente truncando sem chunking. Varrer mês a mês por modalidade evita esse teto silencioso.
3. **Resumível entre execuções, potencialmente ao longo de dias** — não um único processo de horas a fio. Novo arquivo de progresso (`data/interim/ingestao/progresso_varredura_nacional.json`) marca `(modalidade, ano-mês)` já concluído, para retomar exatamente de onde parou numa nova chamada do script, sem re-varrer o que já foi feito. Reaproveita `FilaPendencias` já existente para páginas abandonadas dentro de um chunk.
4. **Itens e documentos deixam de depender de `backfill_itens.py`/`backfill_documentos.py` rodado manualmente antes.** Passam a ser buscados em tempo real quando o usuário abre `/dossies/[id]`, direto do runtime Node/TypeScript do Next.js (decisão: não subprocesso Python) — consistente com o precedente já existente em RF-005 (fastembed em Python para lote, `@huggingface/transformers` em Node para tempo real, mesmo modelo, confirmado idêntico empiricamente). Os dois scripts Python de backfill continuam existindo para reprocessamento em lote quando fizer sentido (ex.: popular itens para métricas agregadas), mas não são mais o único caminho.
5. **Análise via LLM continua fora de escopo desta fase** — sem chave configurada neste ambiente. O clique passa a entregar itens + documento extraído na hora; "Analisar" fica com o mesmo aviso já existente ("achados dependem de chave de LLM não configurada").

## Parte 1 — Varredura nacional de metadados (Python, batch resumível)

### Files that change
- `scripts/varredura_nacional.py` (novo) — itera `(modalidade, ano-mês)` a partir de `2021-01` até o mês corrente, pulando o que já está em `progresso_varredura_nacional.json`; cada chunk chama `coletar_dia(f"{ano}{mes}01", último_dia_do_mês, orcamento_segundos=<por-chunk>)`; ao fim de cada chunk bem-sucedido (sem pendência nova registrada), marca como concluído no progresso e faz upsert imediato no Supabase (não acumula tudo em memória até o fim — uma execução pode ser interrompida a qualquer momento sem perder o que já rodou).
- Aceita `--orcamento-total-segundos` (teto da execução inteira desta chamada) e `--orcamento-por-chunk-segundos`, ambos com default conservador.
- Log claro de progresso: `"[mod=6 2023-04] N contratações, X/Y chunks concluídos"`.

### Order of work
1. Escrever o script, testar num intervalo pequeno e recente primeiro (1 mês, 1 modalidade) para confirmar o chunking e o progresso funcionam antes de qualquer execução longa.
2. Rodar em background com orçamento total alto, monitorar throttle/pendências.
3. Pode precisar de múltiplas invocações ao longo de dias — o progresso persistido garante que isso é seguro.

## Parte 2 — Enriquecimento sob demanda (Node/TypeScript)

### Files that change
- `src/licitimart/web/src/lib/pncp/client.ts` (novo) — `buscarItens(numeroControlePNCP)` e `buscarArquivos(numeroControlePNCP)`, portando a lógica de parse de `numero_controle_pncp` e as duas URLs (`BASE_URL_ITENS`) já usadas em `pncp.py`. GET simples, sem necessidade de throttle de descoberta (chamada é 1 clique = 1-2 requisições, não varredura em lote).
- `src/licitimart/web/src/lib/pncp/extracao.ts` (novo) — extração nativa de texto de PDF/DOCX equivalente a `extracao.py`, usando `pdf-parse` (PDF) e `mammoth` (DOCX) — únicas duas dependências novas do projeto Node. Mesma regra: PDF sem camada de texto vira `requer_ocr` explícito.
- `src/licitimart/web/src/app/dossies/[id]/actions.ts` (novo ou existente) — Server Action `buscarEnriquecimento(contratacaoId)`: se já existem itens/documento no Supabase, não refaz a chamada; senão busca no PNCP, extrai, grava (mesmas tabelas que os scripts Python já escrevem, mesmo formato).
- `src/licitimart/web/src/app/dossies/[id]/page.tsx` — troca "coleta parcial em andamento" por um botão "Buscar itens e documento agora" quando a contratação ainda não tem nada, chamando a Server Action; estado de carregamento explícito (chamada real ao PNCP pode levar alguns segundos).

### Order of work
1. Portar `client.ts` primeiro, testar contra uma contratação real já conhecida (uma das 248) comparando o resultado com o que `buscar_itens`/`buscar_arquivos` em Python já trouxe para a mesma — confirma paridade antes de confiar no caminho novo.
2. `extracao.ts`, testado contra o mesmo PDF real já usado na Fase K/M (texto extraído deve bater com o que `extracao.py` já produziu).
3. Server Action + UI, `npm run build`.
4. Teste real: abrir uma contratação das 248 que ainda não tem item/documento, clicar, confirmar que aparece.

## Ordem entre as duas partes

Partes independentes — não há dependência de dados entre elas (a Parte 2 já funciona hoje com as 248 contratações existentes). Vão em paralelo: a varredura nacional roda em background (processo longo, majoritariamente esperando o throttle) enquanto o enriquecimento sob demanda é implementado e testado.
