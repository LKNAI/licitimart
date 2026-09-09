# Schema Licitimart (Fase C)

Sem projeto Supabase real conectado ainda (decisão pendente do usuário — ver `CLAUDE.md`). Este diretório existe para que, no dia em que o projeto existir, aplicar o schema seja `supabase link` + `supabase db push`, não um trabalho de design começando do zero.

## O que tem aqui

- `config.toml` — gerado por `supabase init`.
- `migrations/20260909222844_schema_inicial.sql` — todas as tabelas, índices e RLS da v1. Ver `plan.md` para a decisão de modelagem (contratação é pública/compartilhada; análise é por tenant).

## Validação feita sem projeto real

Não há como testar contra um Postgres de verdade neste ambiente (sem Docker, sem projeto Supabase). A migration foi validada com `pglast` (bindings Python da gramática real do Postgres) — 60 statements, sintaxe confirmada. **Isso prova sintaxe, não comportamento** — RLS, índices e constraints só se provam de verdade no primeiro `supabase db push` contra um projeto real.

## Quando houver projeto Supabase real

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

Depois disso, o coletor Python (`src/licitimart/ingestao/`) passa a escrever em `contratacoes`/`itens_licitacao`/`manifestos_ingestao`/`pendencias_ingestao` usando a service role key (que ignora RLS), e o webapp passa a ler via `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.local`, ver `src/licitimart/web/.env.example`) em vez dos JSONs de ponte (`scripts/exportar_*.py`) — as duas coisas coexistem até essa migração acontecer, não precisam ser trocadas no mesmo dia.

## Nunca commitar

Chaves reais de Supabase (`service_role`, `anon`) nunca entram aqui nem em `.env.local` — só em variável de ambiente do ambiente de execução real (Vercel, etc.), fora do git.
