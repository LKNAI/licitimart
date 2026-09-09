# Licitimart — Instruções de Projeto

**SaaS multi-tenant de inteligência de licitações**, conectando o fluxo de contratações públicas brasileiras (PNCP como fonte primária da v1) à decisão de venda privada — triagem, análise técnica/jurídica e recomendação Go/No-Go, com dois diferenciais que não existem em radar de licitação genérico: Impugnação Assistida e Diff de Retificação.

## Origem deste projeto

Este projeto nasceu de uma avaliação comparativa entre uma ERS inicial (elaborada em outra ferramenta) e o workspace **SAU** (`C:\Users\LKN\Desktop\Claude\Projetos\SAU`), um sistema de auditoria de licitações de saúde já em produção que compartilha a mesma fonte de dado (PNCP). O SAU **não é dependência de código** deste projeto — os domínios de negócio são opostos (auditor fiscalizando comprador vs. vendedor caçando oportunidade) e a infraestrutura não porta (ferramenta local de um usuário vs. SaaS multi-tenant). O que veio do SAU foram **lições operacionais caras** sobre o PNCP e um **padrão de governança de IA** sobre documento oficial — ver `docs/ERS_Licitimart_v1.md` para a especificação completa e os arquivos correspondentes em `Planejamento/` no diretório pai para a análise original.

## Fluxo de artefatos (inspirado no "AI-native SDLC")

Este projeto segue a cadeia `intent.md → spec.md → plan.md → código` — cada estágio produz um artefato versionado que o próximo lê, em vez de a decisão ficar só na cabeça de quem está codando:

- **`docs/intent.md`** — o problema e o resultado proposto, na motivação original, sem RF/RNF. Muda raramente.
- **`docs/ERS_Licitimart_v1.md`** — o `spec.md` do projeto: requisitos, arquitetura, RF/RNF completos. Muda conforme o produto evolui.
- **`plan.md`** (por spike/feature, dentro da própria pasta do trabalho, ex. `spikes/01_ingestao_pncp/plan.md`) — o que muda, em que ordem, qual o risco — escrito **antes** de editar código, não depois. Regra aprendida do jeito caro: os dois bugs de refatoração cometidos na rodada 2 do spike 01 (recursão infinita, timeout sem orçamento) aconteceram exatamente nas vezes em que fui direto para o código sem esse passo.
- **`resumo.md`** de cada spike já cumpre o papel de trilha de auditoria/achado de revisão para aquele experimento — não duplicar em outro artefato.

## Princípio central

**A v1 é deliberadamente mais estreita que a ambição do produto.** Cobertura nacional (5.500 municípios), OCR pleno, radar de concorrência e customização de scoring ficam para v2/v3 — não porque sejam menos importantes, mas porque construir tudo de uma vez, sem testar as premissas de maior risco, foi exatamente o erro que o SAU cometeu com uma segunda fonte de dado (compras.gov) e corrigiu depois de já ter publicado números errados.

## Estado atual: fase de spikes de risco

Antes de construir a v1 inteira, três premissas de alto risco estão sendo testadas isoladamente em `spikes/`, em paralelo com o início da construção do restante (que é engenharia previsível, não precisa esperar):

| Spike | Pergunta que testa | Por que é caro descobrir tarde |
|---|---|---|
| `01_ingestao_pncp` | ~~O comportamento do PNCP sob carga...~~ **Concluído e promovido a `src/licitimart/ingestao/`** após 3 rodadas — throttle com descoberta empírica + fila de pendências persistente em disco (nunca perde página, mesmo sob instabilidade real do servidor, confirmada duas vezes em 09/09). | — |
| `02_citacao_validada` | O pipeline "localizar citação → validar substring literal → refinar" funciona contra edital real e é o suficiente para sustentar RNF-010/011? | É a base de todo o diferencial de confiabilidade do produto — se não funcionar, o pilar de "prova, não opinião" cai. |
| `03_impugnacao_assistida` | ~~O detector de cláusula restritiva tem sinal real...~~ **Rodada 2:** 8 padrões, 14/14 casos corretos, + `minuta.py` (gerador de minuta por template determinístico, não LLM — avança sem chave de API). Fora do sinal técnico, esta é a maior exposição jurídica do produto (ver RN-006) — precisa de revisão de advogado antes de qualquer lançamento, independentemente do resultado técnico do spike. |

Ver o README de cada spike para hipótese, método e critério de aprovação/reprovação. **Nenhum spike deve sobrecarregar a infraestrutura real do PNCP** — throttling é sempre conservador por padrão (nunca menos que ~0,35–0,5s de espaçamento global), e nenhum teste deve deliberadamente tentar reproduzir a falha de rate limit em rajada — isso é abuso de infraestrutura pública de terceiro, não pesquisa.

## Stack

- **Ingestão:** Python + httpx, com limitador de taxa adaptativo por fonte e fila de pendências persistente em disco como componentes de primeira classe — código real em `src/licitimart/ingestao/` (`throttle.py`, `pendencias.py`, `pncp.py`), promovido do spike 01 após 3 rodadas de teste contra o PNCP real.
- **Aplicação Web & API:** Next.js 15 (TypeScript, App Router, Tailwind) — 9 rotas em `src/licitimart/web/`, todas com build e navegação verificados em navegador real: `/dossies`, `/dossies/[id]`, `/pipeline`, `/metricas`, `/impugnacoes`, `/retificacoes`, `/tenant`. `/dossies` mostra **913 contratações reais do PNCP** lado a lado com 3 exemplos ilustrativos, sempre com rótulo de origem visível (`ROTULO_ORIGEM`). `/impugnacoes` mostra minutas geradas pelo motor **real** do spike 03 (`scripts/exportar_minutas_exemplo.py`), não fabricadas à mão. Pontes de dado (`scripts/exportar_*.py`) rodam o Python real e exportam JSON lido em runtime via `fs` — nunca `import` estático, para o build nunca depender de um snapshot que talvez não exista (arquivos gerados ficam de fora do git, mesma regra de `data/**`). Falta: Supabase real, auth, automatizar a cadência de exportação.
- **Banco & Auth:** Supabase — **projeto real criado e schema aplicado** em 09/09/2026 (ver `supabase/README.md`). O coletor Python já escreve de verdade (`src/licitimart/ingestao/supabase_store.py` + `scripts/exportar_para_supabase.py`, `service_role`, upsert idempotente testado) — 248 contratações reais na tabela `contratacoes`. O webapp (`src/licitimart/web/`) ainda lê do JSON de ponte da Fase A, não do Supabase — falta autenticação real (Fase D) para isso, porque a policy de leitura exige `to authenticated`. Repositório publicado em `https://github.com/LKNAI/licitimart`.
- **LLM:** OpenAI/Anthropic via LiteLLM — cliente ainda não configurado neste ambiente (sem `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` disponível aqui); o spike 02 roda em modo "mock" até uma chave real ser configurada, e isso deve ficar marcado explicitamente nos resultados, nunca disfarçado de validação completa. Achado: nem todo avanço depende de LLM — o spike 03 (rodada 2) e o gerador de minuta por template provam que fundamentação fixa/determinística não precisa de geração de linguagem nenhuma.
- **OCR:** motor a nomear (candidatos: Google Document AI, AWS Textract) — fora do escopo dos spikes atuais.

## Estrutura

```
Licitimart - webapp/
├── CLAUDE.md
├── docs/                      (cópia de referência da ERS, sem duplicar edição — a fonte é Planejamento/)
├── spikes/                    (as três provas de risco descritas acima — descartável após decisão, mas versionado até lá)
│   ├── 01_ingestao_pncp/
│   ├── 02_citacao_validada/
│   └── 03_impugnacao_assistida/
├── src/licitimart/            (esqueleto da v1 real — só cresce depois que um spike valida a premissa correspondente)
│   ├── ingestao/              (código de produção real — promovido do spike 01 após 3 rodadas)
│   ├── ocr/                   (vazio — fora de escopo dos spikes atuais)
│   ├── agentes/               (AG-01 a AG-07 — nasce dos spikes 02 e 03; AG-06 já tem base em spikes/03, falta promover)
│   └── web/                   (esqueleto Next.js real, 9 rotas — ver src/licitimart/web/README.md e plan.md)
├── supabase/                  (schema versionado — ver supabase/README.md e plan.md; sem projeto real conectado)
└── data/                      (saída de spike e cache; fora do git — ver .gitignore)
```

## Regras específicas deste projeto

- **Nenhum spike, script ou teste deve martelar o PNCP em rajada deliberada.** O piso de 0,35s citado nas primeiras notas deste projeto era herdado do SAU sem reteste — o spike 01 (rodada 2, execução completa) provou que não se sustenta aqui: o servidor limita a taxa bem antes disso quando a varredura cobre várias modalidades na mesma janela, e o regime realmente sustentável observado foi ~7,5–10s de espaçamento, com um throttle que **descobre empiricamente** a margem segura em vez de assumir um número fixo (ver `spikes/01_ingestao_pncp/throttle.py` e `resultados/resumo.md`). Qualquer código de ingestão novo deve seguir esse padrão de descoberta, nunca reintroduzir um piso fixo copiado de outro contexto.
- **Resultado de spike é sempre honesto sobre o que foi de fato testado.** Se um teste rodou em modo mock (sem LLM real) ou sobre dado sintético (não edital real), isso precisa estar escrito no próprio resultado — nunca apresentado como validação completa.
- **Nenhum código do SAU é copiado literalmente para este repositório.** Padrões e lições, sim (documentados); implementação, não — os dois projetos têm ciclos de vida, licenciamento e domínios de negócio independentes.
- **RN-006 (Impugnação Assistida) é bloqueio de lançamento, não de desenvolvimento.** Pode-se construir e iterar o agente AG-06 livremente; o que não pode acontecer é esse recurso chegar a cliente real antes de uma revisão jurídica formal.
- **Todo orçamento de tempo tem que ser checado dentro do loop de retentativa de uma página, não só entre páginas.** Achado real (spike 01, rodada 3, 09/09): sem essa checagem interna, uma sequência de páginas travadas pode ultrapassar bastante o teto pretendido — cada página abandonada custa até `MAX_TENTATIVAS_POR_PAGINA × TETO_MAXIMO_SEGUNDOS` sem nenhum corte no meio. Corrigido em `src/licitimart/ingestao/pncp.py`; qualquer novo conector de fonte precisa do mesmo cuidado.
- **Se duas evidências independentes no mesmo dia indicarem instabilidade real da fonte (não do nosso throttle), parar de tentar coletar e esperar, não insistir em loop.** Em 09/09, a rodada 3 do spike e, horas depois, um smoke test isolado do módulo de produção viram timeout sustentado em modalidades diferentes (inclusive a modalidade 4, que nunca tinha falhado) — sinal de degradação ampla do lado do servidor. Rodar de novo imediatamente só desperdiça tempo e ainda carrega o risco de parecer carga excessiva contra infraestrutura pública.
- **`TaskStop`/interromper um `npm run dev` em background não mata sempre o processo Node filho no Windows** (Next.js com Turbopack pode sobreviver ao "stop" da tarefa). Se a porta 3000 aparecer ocupada por um processo antigo ao subir de novo, checar com `netstat -ano | grep ":3000"` e finalizar por PID (`taskkill //PID <pid> //F` no Git Bash — barra dupla, senão o Git Bash reescreve o caminho).
- **A sessão de terminal usada neste projeto tem `VIRTUAL_ENV` apontando para o venv do SAU por padrão** (herdado do diretório onde a sessão abre) — `python`/`pip`/`uv pip install` sem caminho explícito instalam ou rodam no venv errado, mesmo estando com `cd` dentro da pasta do Licitimart. Achado em 09/09: `supabase` e suas dependências foram parar no venv do SAU por engano antes de eu perceber. Este projeto tem `.venv/` próprio na sua raiz — sempre usar `uv pip install --python ".venv/Scripts/python.exe" ...` e `.venv/Scripts/python.exe <script>` (caminho explícito), nunca confiar em `python`/`uv` "pelado" aqui.
- **Nenhuma variável de ambiente com prefixo `NEXT_PUBLIC_` pode conter segredo (service_role, chave de LLM, etc.)** — o Next.js empacota qualquer var com esse prefixo no JavaScript enviado ao navegador de qualquer visitante. Quase aconteceu em 09/09: um `.env` foi criado por engano dentro de `src/licitimart/web/` com `NEXT_PUBLIC_SUPABASE_ROLE_KEY` guardando a `service_role`. Removido antes de qualquer build/dev rodar com ele presente (nunca chegou a aparecer em `git status` — o `.gitignore` do `web/` já cobria `.env*`). Regra fixa: **segredo de backend (service_role, chaves de LLM) só existe no `.env` da raiz do projeto** (lido pelo lado Python), nunca dentro de `src/licitimart/web/` em arquivo nenhum — só a `anon` key (pública por natureza) pertence a `web/.env.local`.
- **Responder sempre em português neste projeto.**
