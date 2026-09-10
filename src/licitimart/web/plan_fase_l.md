# Plan: Fase L — Dossiê de decisão exportável (RF-007, parte 2)

Escrito antes do código. Sétima fase da sequência para fechar a v1. RF-007 tinha duas partes: "Kanban com os três veredictos" (Fase G, concluída) e "dossiê de decisão exportável em .docx/PDF, arquivável para comitê de compliance interno do cliente" (esta fase).

## Decisão de escopo
1. **Só `.docx` nesta fase, não `.docx` + PDF.** Os dois formatos pedidos no RF, mas `.docx` sozinho já cobre o caso de uso real (arquivo para comitê de compliance interno — Word é o padrão de fato nesse contexto). Exportar PDF também é aditivo depois (lib diferente, `pdf-lib` ou renderização via headless browser), não retrabalho.
2. **Biblioteca `docx` (npm, `dolanmiu/docx`) no lado Node** — gera o arquivo em memória, sem dependência nativa, sem precisar de um processo Python à parte só para isso (diferente de `python-docx`, que já usamos do lado da extração, mas rodaria num contexto de processo separado do Next.js).
3. **Conteúdo do dossiê exportado:** identificação da contratação (órgão, número PNCP, modalidade, valor, data), veredito atual com quem decidiu (a Fase G já grava `criado_por`), Selo de Confiabilidade, itens (se houver), achados (se houver — hoje vazio para dossiê real, mas o export já suporta popular quando existir), e timestamp de geração do arquivo — é o "arquivo para comitê", precisa se sustentar sozinho fora da tela.
4. **Rota de download (`Route Handler`), não Server Action** — download de arquivo binário com nome de arquivo correto exige controlar `Content-Disposition`, que é natural num Route Handler (`GET`), não numa Server Action (pensada para retornar dado serializável, não stream binário).

## Files that change
- `src/licitimart/web/package.json` — `docx`.
- `src/licitimart/web/src/app/dossies/[id]/exportar/route.ts` — gera o `.docx` e retorna como download.
- `src/licitimart/web/src/app/dossies/[id]/page.tsx` — link "Exportar dossiê (.docx)".

## Order of work
1. Route handler + link.
2. `npm run build`.
3. Teste real: baixar o `.docx` via requisição HTTP autenticada (script Node com sessão real), confirmar que o arquivo é um `.docx` válido (assinatura ZIP + consegue abrir com a própria lib `docx`/`mammoth` ou checagem de estrutura) e que o conteúdo bate com o dossiê de origem.

## Concluído (10/09/2026)

Testado com `npm run dev` real + requisição HTTP autenticada de verdade (cookie de sessão do Supabase replicado no formato que `@supabase/ssr` usa, não um bypass de auth): rota bloqueada sem sessão (307 → `/login`), autenticada retorna 200 com `.docx` real (assinatura ZIP válida, `Content-Disposition` com nome de arquivo derivado do número de controle PNCP). Conteúdo verificado abrindo o `document.xml` interno (via `jszip`) e confirmando que contém o órgão e o número de controle PNCP reais da contratação de teste — não é só "gerou algum arquivo", é "gerou o arquivo certo".

## Proof
- [x] Download autenticado funciona, retorna `.docx` válido (200, content-type correto, assinatura ZIP, abre com `jszip`).
- [x] Conteúdo do arquivo reflete os dados reais do dossiê no momento da exportação (órgão + número PNCP confirmados dentro do XML gerado).
