# Plan: Fase K — Extração de PDF/DOCX nato-digital (RF-002)

Escrito antes do código. Sexta fase da sequência para fechar a v1.

## Decisão de infraestrutura (resolvida nesta fase)
1. **Bucket privado no Supabase Storage, `editais-documentos`.** Leitura para qualquer autenticado (mesmo padrão de `contratacoes`/`itens_licitacao`/`retificacoes` — é documento público do PNCP, não segredo de tenant); escrita só via `service_role` (o coletor Python), sem policy de insert/update/delete para `authenticated`.
2. **Extração nativa só (`pypdf`/`python-docx`), nenhuma chamada de OCR paga nesta fase.** PDF/DOCX nato-digital (texto real embutido) é extraído de verdade. PDF escaneado (sem texto extraível) vira `requer_ocr` — estado explícito, nunca escondido nem inventado (RF-020) — motor de OCR pago (Document AI/Textract) fica para quando houver decisão/orçamento, exatamente como já estava documentado em `src/licitimart/ocr/README.md`.
3. **Escopo do backfill: só o documento tipo "Edital" por contratação, não todo anexo.** Testei ao vivo (`GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos`) e uma contratação real trouxe 3+ arquivos (edital, planta, ETP) — baixar todos infla banda/storage sem ganho proporcional nesta fase; o edital é o documento que sustenta RF-006 (dossiê estruturado) e RF-017 (impugnação sobre edital real).
4. **Backfill em lote bem menor que os das fases anteriores** (`--limite` default baixo) — arquivo de edital real tem ~8MB no teste feito (59 páginas), ordem de grandeza maior que o JSON de metadado ou a chamada de itens; nunca baixar em lote grande numa sessão só.

## Descoberta empírica antes de codificar
```
GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos
```
retorna lista de documentos (`titulo`, `tipoDocumentoNome`, `sequencialDocumento`, `url`). Download do conteúdo:
```
GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos/{sequencialDocumento}
```
Testado contra um edital real (Concorrência Eletrônica, Município de Crato/CE): PDF de 8,6MB, 59 páginas, **texto nato-digital extraído com sucesso** via `pypdf` (não é digitalização escaneada) — confirma que a parte "nato-digital" de RF-002 é implementável agora, sem custo de OCR.

## Files that change
- `supabase/migrations/<timestamp>_fase_k_documentos.sql` — bucket `editais-documentos` + policy de select; tabela `documentos_contratacao` (`contratacao_id`, `sequencial_documento`, `titulo`, `tipo_documento`, `storage_path`, `texto_extraido`, `status_extracao` check `('extraido_nativo','requer_ocr','erro')`, `paginas`, `coletado_em`); RLS select-autenticados, escrita só `service_role`.
- `src/licitimart/ingestao/pncp.py` — `buscar_arquivos(numero_controle_pncp)`, `baixar_arquivo(url)`.
- `src/licitimart/ingestao/extracao.py` (novo) — `extrair_texto_pdf(bytes)`/`extrair_texto_docx(bytes)`: retorna `(texto, status)`; heurística de "requer_ocr" = média de caracteres extraídos por página abaixo de um limiar (poucos caracteres por página em PDF com múltiplas páginas é o sinal clássico de digitalização escaneada sem camada de texto).
- `src/licitimart/ingestao/supabase_store.py` — `salvar_documento(...)`: upload no Storage + upsert em `documentos_contratacao`.
- `scripts/backfill_documentos.py` — lote limitado, só tipo "Edital", mesmo padrão de `backfill_itens.py`/`gerar_embeddings.py`.
- `src/licitimart/web/src/app/dossies/[id]/page.tsx` — mostra status de extração por documento (badge `extraido_nativo`/`requer_ocr`/`erro`), nunca escondido.

## Order of work
1. Migration + `supabase db push`.
2. `pncp.py` + `extracao.py` + `supabase_store.py`, testados com script descartável contra 1 contratação real (endpoint já confirmado acima).
3. `scripts/backfill_documentos.py`, lote pequeno (ex. 5) contra o PNCP real.
4. UI + `npm run build`.

## Concluído (10/09/2026)

Migration aplicada de primeira via `supabase db push`. Backfill rodado (13 contratações processadas no total): **9 documentos reais gravados** — 6 `extraido_nativo` (até 202.739 caracteres extraídos de um edital de 81 páginas), 3 `erro` genuíno (formato não é PDF nem DOCX).

**Bug real pego pelo teste, corrigido antes de seguir:** a extração despachava por extensão no `titulo` do PNCP (`.pdf`/`.docx`) — mas o campo `titulo` da API real **nem sempre inclui extensão** (ex.: título literal `"EDITAL"`, sem `.pdf`), mesmo quando o arquivo é um PDF de verdade. Isso classificava documento perfeitamente extraível como `erro` falso. Corrigido detectando pelo **conteúdo real** (magic bytes: `%PDF` para PDF, `PK\x03\x04` para DOCX/zip) em vez do nome do arquivo — 3 dos 4 "erros" da primeira rodada viraram `extraido_nativo` de verdade após a correção; o 4º continuou `erro` honesto (não é PDF nem DOCX de fato).

Confirmado com re-download do Storage: bytes idênticos ao original (mesmo magic number `%PDF-1.5`).

**Não verificado nesta fase:** nenhum PDF do lote caiu em `requer_ocr` (todos os editais reais encontrados eram nato-digitais) — a heurística existe e está testada só no código (limiar de caracteres/página), não contra um PDF escaneado real, porque nenhum apareceu na amostra.

## Proof
- [x] Documento real baixado, armazenado no Storage e texto extraído com sucesso — 6 contratações, até 202k caracteres.
- [x] Status `requer_ocr` existe e é honesto por construção (nunca inventa texto abaixo do limiar) — não exercitado contra PDF escaneado real nesta amostra, registrado como limitação.
- [x] `/dossies/[id]` mostra o status de extração real, rotulado (badge verde/âmbar/cinza por documento).
