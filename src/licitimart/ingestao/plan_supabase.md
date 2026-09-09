# Plan: escrita real no Supabase a partir do coletor Python

Escrito antes do código, mesma disciplina de sempre. Ver `supabase/plan.md` (schema) e `CLAUDE.md`.

## Problema que este plano resolve

O schema existe e está aplicado (Fase C), mas o coletor Python (`src/licitimart/ingestao/pncp.py`) ainda só alimenta um JSON local (`scripts/exportar_para_webapp.py`), lido pelo webapp em runtime. Essa ponte foi deliberada enquanto não havia Supabase — agora que há, o próximo passo coerente é o coletor escrever direto nas tabelas `contratacoes`/`itens_licitacao`/`manifestos_ingestao`/`pendencias_ingestao`, usando a `service_role` key (ignora RLS, é o papel certo para um processo de backend, não para o browser).

**As duas pontes coexistem por enquanto** (decisão já registrada em `supabase/README.md`) — não vamos apagar `scripts/exportar_para_webapp.py` nesta tarefa; o webapp continua lendo do JSON até uma tarefa futura trocar isso por consulta real (que depende de autenticação, Fase D, porque a policy de `contratacoes` exige `to authenticated`).

## Segredo necessário

A `service_role` key do projeto Supabase real — **nunca no chat, nunca commitada**. Vai para um `.env` na raiz do projeto (já gitignorado), formato:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
O usuário cria esse arquivo ele mesmo; o código só lê a variável de ambiente e falha explicitamente se faltar (mesmo padrão dos clientes TypeScript da Fase A).

## Files that change
- `pyproject.toml`/`requirements.txt` — adicionar `supabase` (cliente Python oficial).
- `src/licitimart/ingestao/supabase_store.py` (novo) — funções `upsert_contratacoes`, `registrar_manifesto`, `sincronizar_pendencias`, todas usando a service role key.
- `scripts/exportar_para_supabase.py` (novo, paralelo a `exportar_para_webapp.py`) — roda o coletor real e escreve no Supabase em vez de JSON.
- `.env.example` (raiz do projeto, novo) — documenta as duas variáveis esperadas, sem valor real.

## Order of work
1. Instalar `supabase` (cliente Python) e conferir import.
2. Escrever `supabase_store.py`: `upsert_contratacoes` faz upsert por `numero_controle_pncp` (chave única do schema) — nunca insert simples, porque rodar o coletor de novo sobre o mesmo dia não pode duplicar linha.
3. Escrever `exportar_para_supabase.py`, reaproveitando `ColetorPublicacaoPNCP` e `FilaPendencias` como já existem — só troca o destino da escrita.
4. Rodar um smoke test pequeno (orçamento curto, 1 modalidade) contra o Supabase real, e conferir no dashboard (ou via `check-supabase.mjs` adaptado) que a linha apareceu.
5. Sincronizar `pendencias_ingestao` e `manifestos_ingestao` também, não só `contratacoes` — é o que dá a RNF-013 (auditabilidade) de verdade no banco, não só no JSON local do `FilaPendencias`.

## Risks
- Upsert errado pode duplicar ou sobrescrever silenciosamente — mitigado testando explicitamente: rodar o script duas vezes seguidas sobre o mesmo dia e conferir que a contagem de linhas não dobra.
- `service_role` key é o segredo mais poderoso do projeto (ignora toda RLS) — nunca deve aparecer em log, print, commit ou nesta conversa. Todo erro tratado no código deve evitar ecoar a chave em mensagem de exceção.

## Proof
- Rodar o script duas vezes seguidas sobre a mesma janela de data não duplica linha em `contratacoes` (upsert funcionando).
- `manifestos_ingestao` ganha uma linha por execução, com contagem e timestamp reais.
- Nenhum segredo aparece em nenhum log/output do script.

## Concluído (09/09/2026)

Rodado contra o Supabase real: **248 contratações reais upsertadas** em `contratacoes`, 1 linha em `manifestos_ingestao`. Idempotência testada diretamente (upsert do mesmo item duas vezes = 1 linha só, confirmado por query, linha de teste removida depois).

**Incidente de segurança no caminho, resolvido antes de virar exposição real:** ao configurar o `.env`, a `service_role` key foi parar por engano dentro de `src/licitimart/web/.env`, numa variável com prefixo `NEXT_PUBLIC_` — que o Next.js embutiria no JavaScript enviado a qualquer visitante. Detectado, corrigido (valor movido para `.env` da raiz, sem o prefixo) e o arquivo perigoso apagado antes de qualquer build/dev rodar com ele presente; nunca apareceu em `git status` (`web/.gitignore` já cobria `.env*`). Regra registrada em `CLAUDE.md`.

**Achado à parte:** o `VIRTUAL_ENV` da sessão de terminal apontava para o venv do SAU por padrão — `supabase` quase foi instalado lá por engano. Corrigido criando `.venv/` próprio do Licitimart; regra registrada em `CLAUDE.md` para nunca confiar em `python`/`uv` sem caminho explícito neste projeto.
