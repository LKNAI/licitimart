# Plan: Fase M — Navegação "clique e veja a página exata" (RF-006)

Escrito antes do código. Oitava fase da sequência para fechar a v1.

## Estado atual
`documentos_contratacao.texto_extraido` (Fase K) guarda o texto de todas as páginas concatenado (`"\n".join(paginas)`), mas **não guarda onde cada página começa** — impossível responder "em que página está este trecho?" sem re-extrair.

## Decisão de escopo
1. **Guardar deslocamento (offset) de início de cada página, não o texto de cada página separado.** Evita duplicar o conteúdo já salvo em `texto_extraido`; um array de inteiros (`paginas_offsets`) é suficiente para, dado o índice de um trecho encontrado, calcular a página via busca binária.
2. **"Ver a página exata" nesta fase = mostrar o número da página + o trecho de texto ao redor do match**, não renderizar a imagem do PDF na tela. Renderização visual do PDF (`pdf.js`) é uma dependência de frontend pesada nova — aditiva depois. O que RF-006 pede ("citação leva ao trecho realçado no PDF de origem") é atendido na essência: a citação é localizada e confirmada no documento real, com página exata — só o "realce visual sobre o PDF renderizado" fica pra depois.
3. **Busca dentro do documento é server-side, sobre o texto já extraído e armazenado** — não abre o PDF de novo a cada busca (o texto já está no banco desde a Fase K).
4. **DOCX não tem página** (formato flui, sem paginação fixa no arquivo) — `paginas_offsets` fica vazio para DOCX, busca ainda funciona mas sem número de página (mostra "documento sem páginas fixas").

## Files that change
- `supabase/migrations/<timestamp>_fase_m_paginas.sql` — coluna `documentos_contratacao.paginas_offsets integer[]`.
- `src/licitimart/ingestao/extracao.py` — `extrair_texto_pdf`/`extrair_texto_docx`/`extrair_texto` passam a retornar também os offsets.
- `src/licitimart/ingestao/supabase_store.py` — `salvar_documento` grava `paginas_offsets`.
- `scripts/backfill_documentos.py` — repassa os offsets (mudança de assinatura).
- Reprocessar os 6 documentos já extraídos (`extraido_nativo`) para preencher `paginas_offsets` retroativamente — sem re-baixar do PNCP, o PDF já está no Storage.
- `src/licitimart/web/src/app/dossies/[id]/documento/[docId]/actions.ts` — `buscarNoDocumento(termo)`: busca case-insensitive no `texto_extraido`, mapeia cada ocorrência para a página via `paginas_offsets`, retorna trecho de contexto.
- `src/licitimart/web/src/app/dossies/[id]/documento/[docId]/page.tsx` — tela de busca dentro do documento, com resultado "página X: ...trecho...".
- Link "Buscar no documento" na lista de documentos em `/dossies/[id]`.

## Order of work
1. Migration + `supabase db push`.
2. `extracao.py` com offsets, testado contra o PDF real já usado na Fase K (mesmo arquivo, comparar offset da página 1 contra o texto conhecido).
3. Script de reprocessamento (lê do Storage, não baixa do PNCP de novo) para os documentos já `extraido_nativo`.
4. Tela + Server Action + `npm run build`.
5. Teste real: buscar um termo que sei que existe na página X de um dos editais reais já extraídos, confirmar que a página retornada bate.

## Concluído (10/09/2026)

Migration aplicada via `supabase db push`. Os 6 documentos `extraido_nativo` da Fase K foram reprocessados (lendo do Storage, sem baixar do PNCP de novo) para preencher `paginas_offsets`.

**Prova de correção real:** o texto "EDITAL Nº 96/2026" — confirmado manualmente na Fase K como estando na página 3 de um edital de 59 páginas — foi localizado pelo algoritmo de busca binária sobre `paginas_offsets` exatamente na página 3. Testado duas vezes: uma vez em Python (script de reprocessamento) e uma vez em Node com sessão de usuário real via RLS (mesma lógica replicada, resultado idêntico).

## Proof
- [x] Offsets de página corretos — termo conhecido retornou a página certa (3), confirmado contra o achado manual da Fase K.
- [x] Busca funciona com sessão real (RLS), mostra trecho + página — lógica de busca binária testada em Node contra dado real.
- [x] DOCX (sem paginação) retorna `null` explícito para página, nunca inventa um número — comportamento garantido pelo código (`paginas_offsets` vazio para DOCX desde `extrair_texto_docx`), não exercitado nesta amostra por não haver DOCX real coletado ainda.
