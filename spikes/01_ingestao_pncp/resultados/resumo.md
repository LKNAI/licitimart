# Resumo — spike 01, rodada 3 (janela 20260908 a 20260908)

**Execução interrompida manualmente em 09/09/2026 ~20:15 UTC** — não terminou pelo orçamento (900s), foi parada porque revelou dois problemas ao mesmo tempo e continuar não geraria leitura mais limpa. Ver `raw_20260909T195841Z.jsonl` para o log bruto.

## O que aconteceu

- Modalidades 1–5 coletadas normalmente (as mesmas ~479 itens de sempre, rápido, sem erro).
- Modalidade 6: sucesso até a página 11; página 12 sofreu 429 (3x) seguido de timeout (3x), esgotou as 6 tentativas, foi **corretamente marcada `pendente_reconciliacao: true`** — não desapareceu.
- Modalidades 7, 8: **primeira página de cada uma travou nas 6 tentativas inteiras**, só com timeout (nenhum 429) — sem sucesso nenhum, cada uma consumindo ~6 minutos reais (6 tentativas × ~60s de espera entre elas).
- Modalidade 9: mais 2 timeouts em andamento quando a execução foi interrompida.

## Dois achados, não um

1. **Achado sobre o PNCP:** esta janela específica (09/09 ~20h UTC) mostrou instabilidade real, sustentada, atravessando várias modalidades em sequência (6, 7, 8, 9) — não é mais efeito do nosso throttle, é o servidor mesmo se comportando mal por vários minutos seguidos. Confirmado de forma independente horas depois: um smoke test da versão de produção do conector (`src/licitimart/ingestao/pncp.py`), rodando sozinho e sem qualquer chamada concorrente, viu a **modalidade 4 — que nunca tinha falhado em nenhuma das 3 rodadas — travar 6 vezes seguidas também.** Isso não é mais "modalidade específica com problema", é o PNCP com uma janela de instabilidade ampla.
2. **Achado sobre o próprio spike (bug real, corrigido):** o cheque de orçamento de tempo só existia *entre* páginas, nunca *dentro* das 6 tentativas de uma página. Resultado: a execução já tinha passado de 17 minutos (contra os 15 pretendidos) quando foi interrompida manualmente — e teria passado muito mais, porque cada página travada custa até 6×60s = 6 minutos, sem nenhum corte no meio. Corrigido em `src/licitimart/ingestao/pncp.py` (parâmetro `orcamento_segundos` em `coletar_dia`, checado tanto entre páginas quanto dentro do loop de retentativa) antes de qualquer execução nova.

## Leitura

**Aprovado com ressalva, não reprovado — mas por um motivo diferente das rodadas anteriores.** A arquitetura (paginar por modalidade, throttle com descoberta, fila de pendências persistente) não falhou — ela reagiu exatamente como desenhada às duas coisas que aconteceram: registrou a pendência corretamente e não inventou dado que não coletou. O que não dá para afirmar hoje é uma taxa de throughput sustentável "normal", porque a janela testada não estava em condição normal. Isso não é motivo para desconfiar do design; é motivo para não tentar extrapolar throughput a partir de uma janela ruim.

**Ação decorrente:**
- Bug do orçamento corrigido no módulo de produção (`pncp.py`) — o spike (`coletor.py`) pode ser corrigido depois, mas não é urgente: o módulo de produção já supera o spike em maturidade.
- **Não insistir em nova coleta agora** — a instabilidade observada em duas fontes de evidência independentes (a rodada 3 e o smoke test do módulo de produção, horas de diferença) sugere que vale esperar e testar de novo mais tarde, em vez de rodar em loop contra um servidor que já mostrou sinal de estar mal.
- A fila de pendências persistente (`FilaPendencias` em `pendencias.py`) já provou seu valor na prática: o smoke test do módulo de produção gravou a pendência da modalidade 4 em `data/interim/ingestao/pendencias_pncp_smoke.json`, pronta para ser retomada automaticamente na próxima execução — exatamente o cenário para o qual foi desenhada.
