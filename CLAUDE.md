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
- **Aplicação Web & API:** Next.js 15 (TypeScript, App Router, Tailwind) — esqueleto real em `src/licitimart/web/` (build e navegação verificados em navegador real), rotas `/dossies`, `/dossies/[id]`, `/pipeline` com dado mock explícito (nunca disfarçado de dado real). Falta: Supabase real, auth, conectar ao dado real de `ingestao/`.
- **Banco & Auth:** Supabase (PostgreSQL 16 + pgvector + Auth nativo) — clientes já escritos (`src/licitimart/web/src/lib/supabase/`), exigem env var real e falham explicitamente sem ela; nenhum projeto Supabase configurado ainda (`.env.local` vazio).
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
│   └── web/                   (esqueleto Next.js real, dado mock — ver src/licitimart/web/README.md e plan.md)
└── data/                      (saída de spike e cache; fora do git — ver .gitignore)
```

## Regras específicas deste projeto

- **Nenhum spike, script ou teste deve martelar o PNCP em rajada deliberada.** O piso de 0,35s citado nas primeiras notas deste projeto era herdado do SAU sem reteste — o spike 01 (rodada 2, execução completa) provou que não se sustenta aqui: o servidor limita a taxa bem antes disso quando a varredura cobre várias modalidades na mesma janela, e o regime realmente sustentável observado foi ~7,5–10s de espaçamento, com um throttle que **descobre empiricamente** a margem segura em vez de assumir um número fixo (ver `spikes/01_ingestao_pncp/throttle.py` e `resultados/resumo.md`). Qualquer código de ingestão novo deve seguir esse padrão de descoberta, nunca reintroduzir um piso fixo copiado de outro contexto.
- **Resultado de spike é sempre honesto sobre o que foi de fato testado.** Se um teste rodou em modo mock (sem LLM real) ou sobre dado sintético (não edital real), isso precisa estar escrito no próprio resultado — nunca apresentado como validação completa.
- **Nenhum código do SAU é copiado literalmente para este repositório.** Padrões e lições, sim (documentados); implementação, não — os dois projetos têm ciclos de vida, licenciamento e domínios de negócio independentes.
- **RN-006 (Impugnação Assistida) é bloqueio de lançamento, não de desenvolvimento.** Pode-se construir e iterar o agente AG-06 livremente; o que não pode acontecer é esse recurso chegar a cliente real antes de uma revisão jurídica formal.
- **Todo orçamento de tempo tem que ser checado dentro do loop de retentativa de uma página, não só entre páginas.** Achado real (spike 01, rodada 3, 09/09): sem essa checagem interna, uma sequência de páginas travadas pode ultrapassar bastante o teto pretendido — cada página abandonada custa até `MAX_TENTATIVAS_POR_PAGINA × TETO_MAXIMO_SEGUNDOS` sem nenhum corte no meio. Corrigido em `src/licitimart/ingestao/pncp.py`; qualquer novo conector de fonte precisa do mesmo cuidado.
- **Se duas evidências independentes no mesmo dia indicarem instabilidade real da fonte (não do nosso throttle), parar de tentar coletar e esperar, não insistir em loop.** Em 09/09, a rodada 3 do spike e, horas depois, um smoke test isolado do módulo de produção viram timeout sustentado em modalidades diferentes (inclusive a modalidade 4, que nunca tinha falhado) — sinal de degradação ampla do lado do servidor. Rodar de novo imediatamente só desperdiça tempo e ainda carrega o risco de parecer carga excessiva contra infraestrutura pública.
- **Responder sempre em português neste projeto.**
