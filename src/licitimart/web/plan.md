# Plan: esqueleto do web (Next.js 15 + Supabase)

Escrito antes de rodar o scaffold — mesma disciplina do spike 01. Ver `docs/intent.md`, `docs/ERS_Licitimart_v1.md` (seção 2.3) e `../../CLAUDE.md`.

## Problema que este plano resolve

O `web/` está vazio desde o início do projeto, deliberadamente — a decisão registrada no README daquela pasta era esperar os spikes terem resultado antes de desenhar tela sobre um modelo que ainda podia mudar de forma. O spike 01 (ingestão) já chegou a código de produção; os spikes 02 e 03 não bloqueiam mais a existência de um esqueleto (só bloqueiam telas que dependam deles diretamente — ex. exibir citação validada por LLM). Faz sentido começar a estrutura agora, sem esperar os três spikes fecharem.

## Files that change (criação, não edição)
- `src/licitimart/web/` — projeto Next.js 15 completo (App Router, TypeScript, Tailwind, `src/` dir, alias `@/*`).
- `src/licitimart/web/lib/supabase.ts` — cliente Supabase (browser + server), lendo de variáveis de ambiente, sem credencial real commitada.
- `src/licitimart/web/.env.example` — variáveis esperadas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.), documentando o que falta configurar quando houver projeto Supabase real.
- `src/licitimart/web/app/` — rotas mínimas refletindo os perfis de usuário do `spec.md` (seção 2.2): `/` (login/landing), `/dossies` (lista, dado mock — RF-006), `/dossies/[id]` (detalhe, dado mock), `/pipeline` (Kanban Go/No-Go, RF-007, dado mock).
- `src/licitimart/web/README.md` — como rodar, o que é mock vs. real, o que falta.

## Order of work
1. `npx create-next-app@latest` não-interativo, com as flags decididas (TypeScript, App Router, Tailwind, `src/`, alias `@/*`, sem exemplo padrão do template).
2. Instalar `@supabase/supabase-js` e `@supabase/ssr`.
3. Criar `lib/supabase.ts` (cliente browser + cliente server, ambos exigindo env var, com erro claro se faltar — nunca client mock silencioso).
4. Criar `.env.example` e `.env.local` vazio (gitignored) com placeholder.
5. Criar as 4 rotas mínimas com dado mock explícito (`// MOCK — sem Supabase real ainda`), nunca fingindo que é dado de produção.
6. `README.md` do `web/` — como rodar (`npm run dev`), o que é mock, o que falta (Supabase real, auth real, agentes reais).
7. `npm run build` para confirmar que o esqueleto compila antes de considerar concluído — mesma disciplina de `py_compile` que usamos no Python.

## Risks
- `create-next-app` pode pedir interação (prompt) mesmo com flags — mitigado testando com `--yes`/flags explícitas e checando saída antes de assumir sucesso.
- Sem Supabase real, qualquer tela "bonita demais" pode passar a impressão de que há dado de produção — mitigado com aviso visual explícito de "MOCK" em cada rota até a integração real existir.
- Next.js 15 pode ter mudado alguma flag do CLI desde o treinamento — validar com `npx create-next-app@latest --help` antes de rodar o comando real.

## Proof
- `npm run build` passa sem erro.
- `npm run dev` sobe e as 4 rotas respondem (verificado depois, com Playwright ou navegador real — não só `curl`, porque é JS renderizado).
- Nenhuma tela afirma "dado real" quando é mock.

## Concluído (09/09/2026)

Esqueleto entregue e verificado em navegador real (Playwright, sem erro de console em nenhuma rota). Screenshots conferidos manualmente.

## Fase A — ponte de dado real (09/09/2026, mesmo dia)

Depois do esqueleto, conectamos o coletor de produção (`src/licitimart/ingestao/pncp.py`) ao webapp sem esperar Supabase:

- `scripts/exportar_para_webapp.py` roda o coletor real (orçamento curto, 90s) e exporta `src/licitimart/web/src/lib/data/contratacoes_pncp.json` — 913 contratações reais do PNCP em uma execução.
- `src/lib/data/dossiesReais.ts` carrega esse snapshot e mapeia para o tipo `Dossie`, **sempre** com `veredito: "revisao_humana"` e `confiabilidade: "fonte_unica"` — nunca inventando score sobre dado não analisado (RNF-012).
- `Dossie.origem` (`"pncp_real"` | `"mock_ilustrativo"`) garante que dado real e mock ilustrativo nunca se misturam silenciosamente — toda tela mostra o rótulo.
- `/dossies` ganhou paginação (916 itens não cabem numa tela só) e mostra a procedência do snapshot (quando coletado, quantos itens, qual janela).
- Bug pego no caminho: `numeroControlePNCP` contém "/" (ex. `...-000967/2026`) — usar isso cru como `id` de rota quebra `/dossies/[id]` (interpretado como dois segmentos). Corrigido sanitizando o id antes de virar `Dossie.id`.
- Verificado em navegador real: lista com 916 dossiês, paginação funcionando, detalhe de item real renderizando corretamente com "Itens ainda não extraídos" e "Nenhuma análise feita ainda" em vez de campos vazios sem explicação.

**Próximo passo desta fase, quando fizer sentido:** rodar o export com escopo maior (mais dias, mais modalidades) e decidir a cadência (script agendado vs. sob demanda) — hoje é execução manual.
