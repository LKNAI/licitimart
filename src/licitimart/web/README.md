# Licitimart — web (v1, autenticação real)

Next.js 15 (App Router, TypeScript, Tailwind). Ver `plan.md` (esqueleto/Fase A/B/C) e `plan_fase_d.md` (autenticação) para o que foi decidido e por quê.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencher com o projeto Supabase real (SUPABASE_URL -> NEXT_PUBLIC_SUPABASE_URL, anon key)
npm run dev
```

Login obrigatório (middleware protege todas as rotas exceto `/login`) — crie uma conta em `/login` (e-mail/senha) e depois uma empresa em `/onboarding` (aparece automaticamente se você ainda não tiver tenant).

## O que é real vs. mock/exemplo, hoje

- **Real, com Supabase por trás:** autenticação (e-mail/senha), sessão (`src/middleware.ts`), criação de tenant (RPC `criar_tenant_e_associar`), `/dossies` e `/metricas` (consulta ao vivo à tabela `contratacoes`, sob RLS). Isolamento entre tenants testado com usuários reais — ver `plan_fase_d.md`.
- **Real, mas ainda por ponte JSON (não Supabase):** nenhuma tela hoje — a Fase D já religou as duas telas mais importantes.
- **Exemplo real, não fabricado à mão:** `/impugnacoes` (minutas geradas pelo motor determinístico do spike 03).
- **Mock/exemplo estático:** os 3 dossiês ilustrativos em `/dossies` (`DOSSIES_MOCK`), `/retificacoes` (diff real, par de texto de exemplo), `/tenant` (formulário sem persistência — RF-004 completo ainda não construído).

## O que falta (não é bug, é próximo passo)

- Magic Link/OAuth (hoje só e-mail/senha — decisão deliberada, ver `plan_fase_d.md`).
- RBAC fino por papel (`analista`/`gestor_comercial`/`juridico_compliance`/`admin_tenant`) — hoje qualquer membro do tenant vê tudo do próprio tenant.
- Recuperação de senha, gestão de membros do tenant.
- Navegação "abrir na página exata" (RNF-010) — depende do spike 02 ter citação validada por LLM real.
- Diff de Retificação sobre dado real — depende do coletor rastrear duas versões da mesma contratação ao longo do tempo (v2 do spike 01).
- RF-004 (Cadastro de Tenant) persistir de verdade em `tenant_catalogo_itens` — hoje `/tenant` é só formulário.
