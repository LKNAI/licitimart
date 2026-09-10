# Fase O — Frontend: do "redesenho visual" ao produto que aguenta uso real

> Este arquivo é um **prompt completo e autocontido**. Foi escrito para ser colado no início de
> uma sessão futura (ou entregue a um subagent) sem depender de contexto de conversa anterior.
> Se você é essa sessão futura: leia o arquivo inteiro antes de tocar em código, ele já contém
> o "porquê", não só o "o quê".

## Contexto

Em 10/09/2026 (commit `21fc247`, skill `frontend-design`) o Licitimart passou por um redesenho
visual completo: papel frio verde-cinza, tipografia Source Serif 4 + Public Sans + IBM Plex Mono,
sistema de "selo" reaproveitado entre Confiabilidade/Veredito/Origem/status de extração. A
intenção documentada no commit é boa e coerente com o produto (ver `CLAUDE.md`, seção de stack:
"prova, não opinião").

**O usuário que encomendou esta fase avaliou o resultado como "muito pobre e fraco"** — não pediu
para reverter a direção estética, mas deixou claro que a execução não está à altura da intenção.
Isso é o ponto de partida desta fase: **não é polimento incremental sobre uma base aprovada, é
uma correção de um resultado que já foi julgado insuficiente.** Trate isso como sinal forte, não
como opinião a ser debatida.

Evidência técnica que já aponta na mesma direção (levantada antes de escrever este prompt, não é
suposição): `globals.css` define paleta e tipografia mas **não define nenhuma transição, easing,
sombra ou elevação real** — só um guard de `prefers-reduced-motion` para animações que não
existem. Isso é consistente com a queixa: o sistema visual tem cor e fonte, mas não tem
comportamento. Um "ledger de verificação" pode (e talvez deva) ser sóbrio, mas sóbrio não é o
mesmo que estático e sem resposta ao toque.

## Objetivo desta fase

Elevar o frontend de "paleta aplicada" para um produto que parece **feito por gente que usa
software bom todo dia** — nas quatro frentes abaixo, escolhidas deliberadamente para não repetir
o escopo do redesenho visual (cor/tipografia/identidade já existem e não são o problema central).

## Escopo — as 4 frentes, nesta ordem de prioridade

### 1. Microinterações e polish (hover, transições, feedback de ação)
Esta é a frente mais provavelmente responsável pela sensação de "pobre e fraco" — é onde
`globals.css` está objetivamente vazio hoje. Cobrir no mínimo:
- Botões (especialmente `VeredictoBotoes.tsx` — a ação Go/No-Go é o momento de maior peso do
  produto) precisam de estado de hover, active/pressed e disabled visualmente distintos, com
  transição real (não instantânea, não exagerada — pensar em ~150–200ms, easing padrão do
  sistema, não default do browser).
- Toda ação assíncrona (salvar veredito, convidar membro, gerar minuta, enriquecer dossiê via
  `EnriquecerBotao.tsx`) precisa de feedback de estado: pendente → sucesso/erro, visível sem
  depender só de um toast que desaparece.
- Selo.tsx (tag de tabela + carimbo circular): decidir deliberadamente se leva
  microinteração (hover com detalhe/tooltip da origem, por exemplo) ou se sua sobriedade é
  intencional — mas a decisão tem que ser explícita no plan.md desta fase, não ausência por
  omissão.
- Navegação (`NavBar.tsx`): transição de estado ativo, não só troca binária de classe.

### 2. Estados vazios, erro e loading
Auditar `/dossies`, `/busca`, `/retificacoes`, `/metricas`, `/pipeline`, `/impugnacoes`,
`/tenant`, `/tenant/membros`: para cada um, existe hoje uma resposta visual real para (a) zero
resultados, (b) erro de carregamento/rede, (c) carregando? Se a resposta for "não, só renderiza
vazio/quebra", esse é o achado a corrigir. Skeleton ou spinner deliberado — não os dois
misturados sem critério pela tela.

### 3. Acessibilidade (a11y)
- Contraste real (WCAG AA no mínimo) para as cores de selo sobre seus próprios `-bg` e sobre
  `--color-surface`/`--color-paper` — medir, não estimar visualmente.
- Selo.tsx e qualquer ícone-com-significado (ex. status de extração, veredito) precisa de texto
  acessível equivalente, não só cor — usuário com daltonismo não pode depender de
  verde/âmbar/vermelho sozinho.
- Tabelas densas (`/dossies`, `/retificacoes`) precisam de `<th scope>` correto e navegação por
  teclado sensata.
- `:focus-visible` já existe globalmente (bom, não regredir) — confirmar que nenhum componente
  novo desta fase o sobrescreve com `outline: none`.

### 4. Responsividade mobile completa
O redesenho testou 1400px e 420px, mas só nas telas que ele tocou, e o teste foi "0 overflow
horizontal", não "usável". Precisa de uma varredura das 12 rotas (ver estrutura em `CLAUDE.md`)
em pelo menos 3 larguras (390px, 768px, 1400px), avaliando não só overflow mas **densidade de
informação e alvo de toque** — tabela com `overflow-x-auto` que rola é tecnicamente correta e
ainda assim pode ser inutilizável num celular real.

## Processo obrigatório (não pular etapas)

Este projeto tem uma regra fixa sobre isso (`CLAUDE.md`): *"plan.md — o que muda, em que ordem,
qual o risco — escrito antes de editar código, não depois."* Os dois bugs de recursão infinita e
timeout sem orçamento do spike 01 aconteceram exatamente quando esse passo foi pulado. Siga a
mesma disciplina aqui:

1. **Auditoria primeiro, sem viés.** Percorrer as 12 rotas reais (login com sessão real, não
   mock) documentando o estado atual de cada uma das 4 frentes, tela por tela. Isso vira a seção
   de diagnóstico do plan.md desta fase — concreto, com nome de arquivo e linha quando possível,
   não "está tudo meio fraco".
2. **Escrever `plan.md` da fase** (`src/licitimart/web/plan_fase_o.md` ou o número de fase que
   estiver livre no momento — conferir o último `plan_fase_*.md` existente primeiro) com a lista
   de mudanças concretas, ordem de execução e risco de cada uma, **antes** de tocar em código.
3. **Implementar por frente**, não por tela — ou seja, resolver "microinterações" nas 12 rotas
   antes de passar para "estados vazios", para manter consistência entre telas em vez de
   consistência dentro de uma tela só.
4. **Testar com Playwright real** (login com sessão real do Supabase, não mock) em 390px, 768px
   e 1400px em cada tela tocada — mesmo padrão já usado no commit `21fc247`. Critério de
   aceite: 0 erros de console, 0 overflow horizontal de `body`, e adicionalmente nesta fase,
   **capturar screenshot de cada tela nas 3 larguras** para revisão visual humana (o "0 overflow"
   sozinho já provou ser insuficiente para pegar "pobre e fraco").
5. **Rodar `npm run build`** a cada fase concluída (regra já existente no projeto).
6. Ao final, resumo honesto do que mudou e do que ficou de fora — se alguma das 4 frentes não
   coube no tempo/orçamento desta sessão, isso precisa estar escrito explicitamente, não
   silenciado.

## Fora de escopo nesta fase (não fazer)

- Trocar paleta, tipografia ou o conceito de "selo" — isso já foi decidido no redesenho visual;
  o problema apontado é de execução (comportamento/estados), não de direção estética.
- Novas telas ou funcionalidades de produto (RF novo) — esta fase é só sobre as telas que já
  existem.
- Qualquer coisa que exija chave de LLM ou toque no coletor Python — fora do raio desta fase.

## Como validar que a fase resolveu a queixa original

Antes de considerar a fase concluída, revisitar a pergunta que a originou: **um usuário que
descreveu o resultado anterior como "pobre e fraco" concordaria que mudou?** Se a resposta exigir
justificativa longa ("tecnicamente está melhor mas visualmente parece igual"), a fase não está
pronta — o critério é a sensação de uso, não só uma checklist técnica cumprida.

---
*Prompt escrito em 10/09/2026, a pedido do usuário, para uso em sessão futura. Frentes e ordem de
prioridade confirmadas por ele via questionário antes da escrita deste documento.*

## Execução (10/09/2026, mesma sessão em que o prompt foi escrito)

O usuário pediu para executar o prompt imediatamente, então a fase rodou na mesma sessão — sem
sessão futura separada. Registro honesto do que foi feito e do que não foi, seguindo a regra do
projeto de nunca disfarçar cobertura parcial de completa:

**Feito:**
- Frente 1 (microinterações): `globals.css` ganhou tokens de motion (`--ease-padrao`,
  `--duracao-*`), estado `:active` com leve `scale`, `cursor-pointer`/`not-allowed` globais,
  spinner reutilizável (`.spinner`) e skeleton (`.skeleton`/`@keyframes pulsar`). Aplicado a
  todos os botões de ação assíncrona do produto (`VeredictoBotoes`, `EnriquecerBotao`,
  `ConvidarForm`, `PapelSelect`, `ItemCatalogoForm`, `RemoverItemBotao`, login, cadastro,
  recuperar/redefinir senha, onboarding, busca) — cada um agora mostra spinner + texto pendente,
  não só texto trocado.
- `NavBar.tsx` reescrito: menu mobile com botão único (☰) em vez de 8 abas em rolagem horizontal,
  sublinhado ativo animado (`scaleX` com transição) em vez de aparecer/sumir abrupto,
  `aria-current="page"`.
- Frente 2 (estados vazio/erro/loading): `error.tsx` e `not-found.tsx` na raiz (não existiam —
  qualquer exceção não tratada derrubava a tela em branco antes desta fase); `loading.tsx` com
  skeleton dedicado em `/dossies`, `/dossies/[id]`, `/retificacoes`, `/metricas`, `/pipeline`,
  `/impugnacoes`, `/tenant`, `/tenant/membros`; estado vazio adicionado em `/dossies` (lista) e
  `/pipeline` (não existiam — renderizavam tabela/colunas em branco sem explicação).
- Frente 3 (a11y): `scope="col"` em todo `<th>` do projeto (dossiês, itens do dossiê, membros,
  catálogo do tenant); toda mensagem de erro de formulário virou região `aria-live="polite"`
  (antes só aparecia/sumia no DOM sem anúncio para leitor de tela); `aria-pressed` no veredito
  ativo.
- Frente 4 (mobile): resolvida via o novo menu de `NavBar.tsx` (o problema mais grave encontrado
  na auditoria: 8 abas em `overflow-x-auto` não é navegação usável em 390px) — não houve
  varredura visual das 12 rotas além disso.
- `npm run build` rodou limpo (TypeScript + Turbopack) depois de cada bloco de mudança.

**Não feito / não testado — declarado explicitamente, não escondido:**
- **Nenhum teste visual real com Playwright** (login com sessão real, 390/768/1400px,
  screenshot). A ferramenta não estava disponível nesta sessão (sem MCP de browser configurado,
  sem `playwright` no `node_modules`). Isso significa que o critério de aceite original do
  prompt — "0 overflow horizontal, 0 erro de console, screenshot revisado" — **não foi
  verificado**, só a compilação (`npm run build`) e a leitura estática do código/CSS gerado.
  Antes de considerar a fase realmente concluída, alguém com acesso a um browser real (ou a um
  MCP de Playwright configurado) precisa abrir as 12 rotas e confirmar visualmente.
- Nenhuma medição de contraste WCAG feita com ferramenta — os tons de selo não foram alterados
  nesta fase (mesma paleta do redesenho anterior), então o risco de contraste insuficiente que
  já existia antes permanece não verificado.
- `/impugnacoes`, `/busca` (resultado) e páginas de auth não receberam a mesma varredura linha a
  linha de responsividade que `/dossies` recebeu — só herdam a correção do menu.
- O critério final do prompt original — "um usuário que chamou o resultado anterior de pobre e
  fraco concordaria que mudou?" — só pode ser respondido por alguém vendo a tela renderizada, não
  por mim lendo o código gerado. Isso fica pendente de validação humana.
