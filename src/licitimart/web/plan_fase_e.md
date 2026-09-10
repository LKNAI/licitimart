# Plan: Fase E — RBAC (gestão de membros) + recuperação de senha

Escrito antes do código. Ver `plan_fase_d.md` (o que ficou deliberadamente fora dela), `docs/ERS_Licitimart_v1.md` (RNF-007), `supabase/migrations/20260909222844_schema_inicial.sql` (`tenant_membros.papel` já existe: `analista`, `gestor_comercial`, `juridico_compliance`, `admin_tenant`).

## Decisões de escopo (minhas, por bom senso — RNF-007 não detalha matriz de permissão por tela)

1. **RBAC nesta fase = quem gerencia membros do tenant, não permissão fina por tela.** RNF-007 pede "privilégios granulares entre analista, gestor comercial, jurídico/compliance e administrador", mas nenhuma tela do produto hoje tem ação que dependa de papel (Go/No-Go, gerar minuta — todo membro do tenant pode). Construir gate de permissão para ações que ainda não existem seria abstração prematura. O que **existe** e precisa de dono é: quem pode convidar/remover gente e mudar papel — isso vira RBAC real nesta fase. Diferenciar analista de jurídico/compliance em telas específicas fica para quando essas telas tiverem ação de escrita real a proteger.
2. **Convite de membro não depende de e-mail de verdade.** Mesmo problema já registrado na Fase D com Magic Link: não dá para testar ponta a ponta sozinho se depender de alguém clicar num e-mail. Decisão: `convidar_membro` (RPC) só associa ao tenant um usuário que **já tem conta** (existe em `auth.users`) — busca por e-mail, erro claro se não encontrar ("peça para a pessoa se cadastrar em /login primeiro"). Convite para quem ainda não tem conta (com envio de e-mail) fica para depois — é aditivo, não retrabalho.
3. **Toda escrita em `tenant_membros` via RPC `security definer`, nunca política de INSERT/UPDATE/DELETE aberta** — mesmo padrão da função `criar_tenant_e_associar` da Fase D (RLS recursiva em cima da própria tabela de associação é sutil e fácil de errar).
4. **Nunca permitir remover ou rebaixar o último `admin_tenant` de um tenant.** Sem essa checagem um admin sozinho consegue trancar o próprio tenant (nenhum membro capaz de gerenciar membros). Erro claro nesse caso, checado dentro da própria função (não na UI).
5. **Recuperação de senha via `resetPasswordForEmail` + `/auth/callback` (troca de código por sessão) + tela de nova senha**, é o fluxo padrão do Supabase e **não depende de LLM** — segue mandado pelo usuário nesta conversa: "toda implementação deve ser realizada, ainda que não [tenhamos] a API da LLM". A limitação real aqui é e-mail de verdade sendo clicado por um humano, igual ao Magic Link da Fase D — mas dá para testar ponta a ponta sozinho usando a API administrativa (`service_role`) `auth.admin.generateLink({ type: "recovery" })`, que gera o link de recuperação **sem enviar e-mail**, e visitando esse link como o teste faria com um clique real. Isso prova o fluxo de verdade (troca de código, sessão de recuperação, atualização de senha), não é mock.

## Files that change
- `supabase/migrations/<timestamp>_fase_e_rbac.sql`:
  - `private.is_tenant_admin(p_tenant_id bigint)` (helper, mesmo padrão de `is_tenant_member`).
  - Policy nova `tenant_membros_select_admin` (admin vê todas as linhas do próprio tenant, não só a própria).
  - RPC `listar_membros_tenant(p_tenant_id bigint)` — retorna `user_id, email, papel, criado_em`; `security definer` (só assim dá pra juntar com `auth.users.email`, que PostgREST não expõe); checa que o chamador é membro do tenant antes de retornar qualquer linha.
  - RPC `convidar_membro(p_tenant_id bigint, p_email text, p_papel text)` — só admin; busca usuário existente por e-mail em `auth.users`; erro se não achar ou se já for membro.
  - RPC `alterar_papel_membro(p_tenant_id bigint, p_user_id uuid, p_papel text)` — só admin; bloqueia rebaixar o último admin.
  - RPC `remover_membro(p_tenant_id bigint, p_user_id uuid)` — só admin; bloqueia remover o último admin.
- `src/app/tenant/membros/page.tsx` — tela de gestão (lista + forms), visível só a quem é `admin_tenant` (checado no server component; não-admin recebe mensagem, não 404 — evita vazar existência da rota por engano de UX, mas sem dado sensível exposto).
- `src/app/tenant/membros/actions.ts` — `convidar`, `mudarPapel`, `remover` (Server Actions chamando as RPCs).
- `src/app/recuperar-senha/page.tsx` + `actions.ts` — pedir e-mail, chama `resetPasswordForEmail`.
- `src/app/auth/callback/route.ts` — troca `code` por sessão (`exchangeCodeForSession`), redireciona para `next` (default `/redefinir-senha` neste fluxo).
- `src/app/redefinir-senha/page.tsx` + `actions.ts` — define nova senha (`updateUser({ password })`) com sessão de recuperação já ativa.
- `src/app/login/page.tsx` — link "Esqueci minha senha".
- `src/app/layout.tsx` — link "Membros" no nav (mostrado sempre; a própria página decide se bloqueia por papel).

## Order of work
1. Escrever a migration (RPCs + policy) e validar sintaticamente.
2. Pedir para o usuário colar no SQL Editor (única ação humana desta fase, mesmo padrão da Fase C/D).
3. Enquanto isso: tela de membros + actions, recuperação de senha + callback + redefinir senha, link no nav/login.
4. `npm run build` + teste em navegador real (Playwright):
   - RBAC: usuário admin convida um segundo usuário de teste (já cadastrado via API administrativa) para o mesmo tenant, muda o papel dele, depois remove — cada ação confirmada pela tela, não só "não deu erro". Usuário não-admin tentando abrir `/tenant/membros` é bloqueado na própria tela.
   - Trava do último admin: tentar remover/rebaixar o único admin de um tenant de teste e confirmar que a RPC recusa com mensagem clara.
   - Recuperação de senha: gerar o link de recuperação via `service_role` (`generateLink`), visitar com Playwright, trocar a senha, logar de novo só com a senha nova.
5. Registrar honestamente no `resumo`/plan o que foi testado (fluxo real ponta a ponta com link gerado por API administrativa) vs. o que não foi (clique em e-mail de verdade chegando na caixa de entrada — isso depende de SMTP configurado no projeto Supabase, fora do que dá para verificar sozinho aqui).

## Risks
- RPC de convite/papel/remoção mal escrita poderia deixar não-admin escalar privilégio — mitigado checando `is_tenant_admin` **dentro** de cada função (nunca só na UI) antes de qualquer escrita.
- Esquecer a trava do último admin tranca um tenant inteiro sem saída — por isso é passo explícito no order of work e tem teste dedicado.
- `resetPasswordForEmail` sem SMTP customizado configurado no projeto Supabase pode não entregar e-mail de verdade em produção (limite do serviço padrão do Supabase) — isso é limitação de configuração de projeto, não de código; fica registrado, não escondido.

## Concluído (10/09/2026)

Sem browser automation disponível nesta sessão (o Playwright usado na Fase D não está configurado como dependência do projeto nem havia ferramenta MCP de navegador ativa aqui) — a prova foi feita em dois níveis, ambos contra o projeto Supabase real, nunca com `service_role` para verificar acesso (só para plantar/limpar dado de teste):

1. **RPCs testadas com sessão real de cada usuário** (script Node descartável, com `@supabase/supabase-js`, sessões via `signInWithPassword` — mesmo princípio do teste de isolamento da Fase D): usuário A cria tenant e vira admin; convida B (já cadastrado) como `analista`; convite para e-mail sem conta falha com mensagem clara; A muda papel de B para `gestor_comercial`, refletido em `listar_membros_tenant`; **B (não-admin) tenta convidar e tenta remover A — as duas tentativas são recusadas pela RPC** (não só pela UI); B, como membro comum, consegue listar os membros (leitura não é admin-only, por decisão de escopo); A remove B; **trava do último admin confirmada duas vezes** — tentativa de A se rebaixar sozinho no tenant falha, tentativa de A se remover sozinho falha. 18/18 checagens passaram.
2. **Recuperação de senha — mecânica completa do lado Supabase testada de ponta a ponta**: `admin.generateLink({type: "recovery"})` gera token sem enviar e-mail de verdade → `verifyOtp` com esse token abre sessão de recuperação → `updateUser({password})` troca a senha → login com a senha nova funciona, login com a senha antiga passa a falhar.
3. **Rotas HTTP checadas com servidor real rodando** (`npm run dev` + `curl`): `/login` e `/recuperar-senha` respondem 200 sem sessão; `/tenant/membros` e `/redefinir-senha` sem sessão redirecionam para `/login` (307); `/auth/callback` sem parâmetro `code` redireciona para `/login` em vez de quebrar.

**O que não foi verificado, por honestidade** (ver regra do projeto sobre nunca disfarçar teste parcial de validação completa): o clique real em um e-mail chegando numa caixa de entrada de verdade (depende de SMTP configurado no projeto Supabase, fora do que dá pra checar sozinho); e a troca do parâmetro `code` por sessão em `/auth/callback` com um código PKCE genuíno gerado por um navegador real que chamou `resetPasswordForEmail` (o teste usou `verifyOtp`/token_hash via API administrativa, que exercita a mesma mecânica do lado Supabase mas não passa pela rota Next.js `exchangeCodeForSession`). O código da rota segue o padrão oficial `@supabase/ssr` usado em `/login`, mas não houve clique real de humano nem execução de navegador que comprovasse essa rota específica ponta a ponta.

## Proof
- [x] Admin convida, muda papel e remove membro — cada ação confirmada por RPC com sessão real (não só "não deu erro").
- [x] Não-admin não consegue convidar/remover via RPC (a UI também bloqueia a tela, não testada em navegador — ver ressalva acima).
- [x] Última trava de admin recusa remoção e rebaixamento — testado duas vezes.
- [x] Recuperação de senha: mecânica completa do lado Supabase (token → sessão → nova senha → login) testada de ponta a ponta com link gerado via API administrativa (não e-mail real). Rota `/auth/callback` com `code` PKEC real de navegador **não** testada (ver ressalva).
