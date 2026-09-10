# Plan: Fase D — autenticação real

Escrito antes do código. Ver `supabase/plan.md`, `docs/ERS_Licitimart_v1.md` (RNF-007, PU-04).

## Decisões de escopo (minhas, por bom senso combinado com o usuário)

1. **Login por e-mail/senha agora, não Magic Link/OAuth.** Magic link exige alguém clicar num e-mail de verdade — não dá para testar de ponta a ponta sozinho. Senha é testável via API administrativa do Supabase (crio usuário de teste com `service_role`, sem precisar de e-mail real). Magic Link/OAuth fica para depois, é mudança aditiva, não retrabalho.
2. **Criação de tenant via função RPC (`security definer`), não políticas de INSERT abertas.** Deixar `tenants`/`tenant_membros` com INSERT liberado para qualquer autenticado é frágil (RLS recursiva em `tenant_membros` checando a própria tabela é sutil e fácil de errar). Uma função no banco que cria o tenant e a associação `admin_tenant` numa transação só é o padrão recomendado pela skill de Postgres consultada na Fase C.
3. **Teste de isolamento entre tenants é obrigatório antes de considerar concluído** — não basta "um usuário loga e vê algo". Vou criar dois tenants de teste com um usuário cada, inserir uma linha em `analises` para cada um (via `service_role`, contornando RLS de propósito só para plantar o dado), e confirmar que o usuário do tenant A **não consegue ver** a linha do tenant B pela API normal (anon key + sessão). Essa é a lição já registrada no projeto: RLS mal testada é o pior erro possível, um teste com um único usuário não prova isolamento nenhum.

## Limite técnico real (não é decisão, é fato)

Não tenho acesso de superusuário ao Postgres nem token de Management API do Supabase — só a `service_role` key, que fala com a API REST (PostgREST), não executa DDL (`CREATE FUNCTION`). A migration nova desta fase (a função RPC) precisa ser colada no SQL Editor pelo usuário, como a `schema_inicial.sql` da Fase C. É a única ação humana necessária nesta fase — o resto eu testo sozinho.

## Files that change
- `supabase/migrations/<timestamp>_fase_d_auth.sql` — função `criar_tenant_e_associar`.
- `src/licitimart/web/src/middleware.ts` — refresh de sessão (padrão `@supabase/ssr`).
- `src/licitimart/web/src/app/login/page.tsx` — form de entrar/cadastrar.
- `src/licitimart/web/src/app/onboarding/page.tsx` — criar primeira empresa (chama a RPC).
- `src/licitimart/web/src/app/logout/route.ts` (ou Server Action) — sign out.
- Proteção de rota: redirecionar para `/login` quem não está autenticado, para `/onboarding` quem está autenticado mas sem tenant.
- `/dossies` passa a consultar `contratacoes` real do Supabase (política já existe, só exige autenticação) em vez do JSON da Fase A — primeira tela realmente ligada ao banco.

## Order of work
1. Escrever e validar sintaticamente (`pglast`) a migration da função RPC.
2. Pedir para o usuário colar no SQL Editor (única ação humana desta fase).
3. Enquanto isso, escrever middleware + login + onboarding + logout + proteção de rota.
4. `npm run build` + navegador real para o fluxo (com um usuário de teste criado via API administrativa, não interação humana).
5. Teste de isolamento entre dois tenants (o mais importante — ver acima).
6. Religar `/dossies` ao Supabase real.

## Risks
- Middleware de sessão mal configurado é a causa nº 1 de bug em integrações Supabase+Next.js (loop de redirecionamento, sessão não persistindo) — mitigado seguindo o padrão oficial `@supabase/ssr` à risca, testado em navegador real antes de seguir.
- Função RPC mal escrita poderia deixar um usuário se associar a um tenant alheio — mitigado por ela sempre criar um tenant novo, nunca aceitar `tenant_id` como parâmetro de entrada.

## Proof
- Dois usuários de teste, dois tenants — usuário A não vê dado do tenant B em nenhuma tabela por tenant, confirmado por query real (não só "não dá erro").
- `/dossies` mostra dado real do Supabase (as 248 contratações), não mais o JSON.
- Sign out funciona e derruba o acesso às rotas protegidas.

## Concluído (09/09/2026)

Tudo testado sozinho, sem precisar de participação ao vivo do usuário (só a colagem da migration no SQL Editor):

1. **Isolamento entre tenants confirmado com dado real** — dois usuários de teste, dois tenants, uma `analise` plantada em cada (via `service_role`, contornando RLS de propósito só para plantar o dado). Consultando com a **sessão de cada usuário** (não `service_role`), usuário A viu só `tenant_id=A`, usuário B só `tenant_id=B`. Zero vazamento.
2. **Fluxo completo de UI testado em navegador real** (Playwright + usuários criados via API administrativa, sem precisar clicar em e-mail): não-autenticado → `/login`; login → `/onboarding` (sem tenant); criar empresa → `/dossies` (251 dossiês: 248 reais do Supabase + 3 ilustrativos); sair → `/login`; `/dossies` bloqueia de novo.
3. **Bug real encontrado e corrigido no caminho:** encadear dois redirects (a `redirect("/dossies")` fixa dentro da Server Action de login + o middleware corrigindo para `/onboarding` na requisição seguinte) fazia o Next.js renderizar a página certa mas deixava a **barra de endereço** mostrando a URL errada até um reload manual — confuso para o usuário, ainda que não fosse falha de segurança (o conteúdo e o acesso já estavam corretos). Corrigido fazendo a própria ação de login checar `tenant_membros` e decidir o destino final antes de redirecionar uma vez só. Achado só porque o teste checou o **texto renderizado**, não só a URL — checar só a URL teria escondido isso.
4. `/dossies` e `/metricas` religados ao Supabase real (`src/lib/data/dossiesSupabase.ts`) — a ponte JSON da Fase A (`dossiesReais.ts`, `scripts/exportar_para_webapp.py`) fica como histórico, não é mais lida por essas duas telas.

**O que fica para depois, deliberadamente fora desta fase:** Magic Link/OAuth, RBAC fino por papel em cada tela (hoje qualquer membro do tenant vê tudo do próprio tenant, sem diferenciar analista/gestor/jurídico), página de gestão de membros do tenant, e recuperação de senha.
