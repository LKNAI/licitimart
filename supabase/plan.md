# Plan: schema SQL versionado (Fase C)

Escrito antes do SQL, mesma disciplina de sempre. Ver `docs/ERS_Licitimart_v1.md` (RF-004/006/007/015/017/019, RNF-005/007/010/012/013).

## Problema que este plano resolve

Não há projeto Supabase real conectado (decisão pendente do usuário, fora do meu controle). Mas o schema não precisa esperar isso: escrever as migrations agora, versionadas, significa que no dia em que o projeto existir é `supabase link` + `supabase db push`, não um trabalho de design que começa do zero. Consultei `supabase-postgres-best-practices` antes de escrever (RLS com `(select auth.uid())`, função `security definer` para checagem de tenant, índice em toda FK, `bigint identity` como PK).

## Decisão de modelagem mais importante

**Contratação (dado do PNCP) não é dado de tenant — é público e compartilhado.** O que é por-tenant é a *análise* sobre aquela contratação (veredito, achados) — a mesma contratação pode ser "Go" para um tenant e "No-Go" para outro, dependendo do catálogo de cada um. Por isso o schema separa:
- `contratacoes` / `itens_licitacao` — compartilhado, leitura aberta a qualquer usuário autenticado, escrita só via `service_role` (o coletor Python).
- `analises` / `achados` / `impugnacoes` — por tenant, RLS restringe a membros do tenant.

Isso evita duplicar 913+ linhas de dado público por tenant, e é o desenho correto para RNF-005 (isolamento) sem desperdiçar armazenamento.

## Files that change
- `supabase/migrations/20260909000001_schema_inicial.sql` — todas as tabelas, índices, RLS.
- `supabase/README.md` — como aplicar quando houver projeto real.

## Tabelas
| Tabela | Tenant-scoped? | Propósito |
|---|---|---|
| `tenants` | — | conta corporativa (RF-004) |
| `tenant_membros` | — | RBAC (RNF-007): user × tenant × papel |
| `contratacoes` | Não (público) | metadado PNCP (RF-006), com procedência (RF-019) |
| `itens_licitacao` | Não (público) | itens da contratação (RF-006) |
| `analises` | Sim | veredito + confiabilidade por tenant×contratação (RF-007, RNF-012) |
| `achados` | Sim (via análise) | achado com citação/página (RNF-010) |
| `impugnacoes` | Sim | minutas geradas (RF-017), status de revisão (RN-006) |
| `tenant_catalogo_itens` | Sim | catálogo de produtos/serviços (RF-004) |
| `consumo_tokens` | Sim | auditoria de tokens por agente (RF-015) |
| `manifestos_ingestao` | — (admin/service only) | procedência de cada lote de coleta (RNF-013) |
| `pendencias_ingestao` | — (admin/service only) | espelho da fila de pendências do coletor Python (visibilidade do PU-05) |

## Order of work
1. Carregar `supabase-postgres-best-practices` (feito).
2. Escrever a migration com todas as tabelas, índices de FK, RLS.
3. Escrever `supabase/README.md`.
4. Validar sintaxe SQL com uma ferramenta local (sem projeto Supabase real para testar de verdade — ver Risks).

## Risks
- **Não há como testar contra um Postgres real neste ambiente** (sem projeto Supabase, sem Postgres local rodando). Mitigação: validação de sintaxe estática + revisão manual cuidadosa; qualquer erro de sintaxe real só aparece no primeiro `supabase db push`, o que é aceitável dado que isso já seria verdade mesmo sem este plano.
- RLS mal escrita é o erro mais caro possível (vaza dado entre tenants) — por isso todo policy usa o padrão `(select auth.uid())` e a função helper `security definer`, não lógica ad hoc por tabela.

## Proof
- Todas as tabelas com RLS habilitada explicitamente (`enable row level security`), sem exceção.
- Toda FK com índice correspondente.
- Nenhuma policy chama `auth.uid()` fora de um `select` (regra de performance do skill).
