# Schema Licitimart (Fase C)

Projeto Supabase real conectado desde a Fase C (`okirbyqkjrwroyrivysw`, região `sa-east-1`). Este diretório versiona o schema aplicado.

## O que tem aqui

- `config.toml` — gerado por `supabase init`.
- `migrations/` — todas as migrations da v1, em ordem. Ver `plan.md` para a decisão de modelagem original (contratação é pública/compartilhada; análise é por tenant).

## Validação antes de aplicar

Toda migration nova é validada sintaticamente com `pglast` (bindings Python da gramática real do Postgres) antes de ir para o banco — **isso prova sintaxe, não comportamento**; RLS, índices e constraints só se provam de verdade rodando contra o projeto real (ver seção de teste de cada fase em `src/licitimart/web/plan_fase_*.md`).

## Como aplicar migration nova (10/09/2026 em diante)

Até a Fase F, cada migration exigia que o usuário colasse manualmente no SQL Editor (única forma disponível — sem `SUPABASE_ACCESS_TOKEN`/login do CLI configurado). A partir de 10/09/2026, com `supabase login` feito uma vez pelo usuário (token fica no keychain local, nunca visto/guardado por mim) e o projeto linkado (`supabase link --project-ref okirbyqkjrwroyrivysw`), aplicar migration nova é:

```bash
npx supabase db push
```

Atenção: a mesma organização Supabase tem **outro projeto não relacionado** (`caqqfimkcxsjmvoyfnmf`, "P1 - MedContent (BR)") — sempre confirmar que o projeto linkado é `okirbyqkjrwroyrivysw` antes de rodar `db push` (`supabase migration list` mostra o link ativo).

As três primeiras migrations (Fases C/D/E) foram coladas manualmente antes desse fluxo existir — reconciliadas no histórico do CLI via `supabase migration repair --status applied <versões>` (marca como aplicada sem reexecutar), sem duplicar nem quebrar nada.

O coletor Python (`src/licitimart/ingestao/`) escreve em `contratacoes`/`itens_licitacao`/`manifestos_ingestao`/`pendencias_ingestao` usando a service role key (que ignora RLS), e o webapp lê via `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.local`).

## Nunca commitar

Chaves reais de Supabase (`service_role`, `anon`) nunca entram aqui nem em `.env.local` — só em variável de ambiente do ambiente de execução real (Vercel, etc.), fora do git.
