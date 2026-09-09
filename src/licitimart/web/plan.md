# Plan: esqueleto do web (Next.js 15 + Supabase)

Ver histórico da Fase A no final deste arquivo. Esta seção cobre a **Fase B**.

## Fase B — telas que só existiam no ERS, não na UI

### RF-014 (Métricas de Produtividade) — maior prioridade, menor risco
Não precisa de dado novo nem de LLM: é agregação sobre `listarTodosDossies()`, que já tem 913 itens reais. Nova rota `/metricas`: total de dossiês, distribuição por veredito, real vs. mock, valor total estimado. **Genuinamente mais real que as outras três** — vale ser a primeira.

### RF-017 (Impugnação Assistida)
Não dá para gerar minuta sobre dossiê real (achados=[], zero análise feita — RNF-012 não permite fingir). Solução: bridge igual à Fase A — `scripts/exportar_minutas_exemplo.py` roda `spikes/03_impugnacao_assistida/detector.py` + `minuta.py` (o gerador determinístico real, não LLM) sobre 1-2 editais sintéticos, exporta JSON para o webapp ler em runtime (mesmo padrão fs + gitignore da Fase A — dado gerado, não fabricado à mão em TypeScript). Nova rota `/impugnacoes` exibe as minutas com o aviso RN-006.

### RF-018 (Diff de Retificação)
Não há retificação real rastreada ainda (isso é trabalho de v2 do coletor). Tela de exemplo estático (dois textos, antes/depois, diff linha a linha), claramente rotulada "exemplo" — não finge ser um caso real.

### RF-004 (Cadastro de Tenant)
Formulário de UI sem persistência (sem Supabase ainda) — estado só no cliente, aviso explícito de que não salva.

## Order of work
1. `/metricas` — sobre dado já existente, sem novo bridge.
2. `scripts/exportar_minutas_exemplo.py` + `/impugnacoes`.
3. `/retificacoes` (ou seção dentro de um dossiê mock) — diff estático de exemplo.
4. `/tenant` — formulário sem persistência.
5. `npm run build` + verificação em navegador real (mesma disciplina de sempre) antes de considerar concluído.

## Risks
- Minuta de exemplo pode parecer real demais — mitigado com o mesmo padrão de rótulo de origem já usado na Fase A, e o aviso RN-006 já embutido no próprio `minuta.py`.
- Diff de retificação sem dado real pode ser descartável depois — aceitável, é só para validar a UX antes de existir dado de verdade.

## Proof
- `npm run build` sem erro.
- 4 rotas novas verificadas em navegador real, sem erro de console.
- Nenhuma tela nova afirma dado real quando é exemplo/mock.

## Concluído (09/09/2026)

As 4 rotas (`/metricas`, `/impugnacoes`, `/retificacoes`, `/tenant`) entregues, build limpo (9 rotas no total), verificadas em navegador real via Playwright — zero erro de console em qualquer uma.

- `/metricas` é a mais valiosa: agregação real sobre os 916 dossiês já carregados (913 do PNCP), não um número inventado — mostrou 100% em "Revisão Humana", o que é o estado real e esperado sem os agentes de IA.
- `/impugnacoes` usa `scripts/exportar_minutas_exemplo.py` (novo bridge, mesmo padrão fs+gitignore da Fase A) para rodar o detector + `minuta.py` **reais** do spike 03 sobre 2 editais sintéticos — a minuta renderizada na tela é gerada pelo motor de verdade, não escrita à mão.
- `/retificacoes` usa um diff por LCS de palavras real (`src/lib/diffSimples.ts`), só o par de textos é exemplo — rotulado como tal.
- `/tenant` é formulário sem persistência, aviso explícito.

---

## Histórico

### Concluído (09/09/2026) — esqueleto inicial
Entregue e verificado em navegador real (Playwright, sem erro de console em nenhuma rota).

### Fase A — ponte de dado real (09/09/2026)
`scripts/exportar_para_webapp.py` roda o coletor real, exporta snapshot (não versionado — dado reproduzível). `/dossies` mostra 913 contratações reais + 3 mock ilustrativos, sempre com rótulo de origem. Loader por `fs` em runtime, nunca `import` estático (build não pode depender do snapshot existir). Bug corrigido: `numeroControlePNCP` contém "/", sanitizado antes de virar `id` de rota.
