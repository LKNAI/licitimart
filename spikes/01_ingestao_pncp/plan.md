# Plan: fila de reconciliação + separação de sinal de erro (spike 01, rodada 3)

Escrito antes de editar código — regra adotada depois de dois bugs de refatoração na rodada 2 (recursão infinita em `gravar()`, orçamento de tempo ausente) que um plano teria evitado. Ver `docs/intent.md`/`../../CLAUDE.md` para o porquê desse hábito.

## Problema que este plano resolve

A rodada 2 (`resultados/resumo.md`) achou dois defeitos reais:
1. Página abandonada após esgotar tentativas **desaparece silenciosamente** — o dado nunca é coletado e nada força uma tentativa futura.
2. O throttle trata conexão pendurada (timeout, sinal ambíguo) com a mesma confiança que um 429/503 (sinal forte de rate limit), o que empurrou o "nível seguro" para um valor bem mais pessimista (90s) do que o regime real sustentado (7,5–10s).

## Files that change
- `throttle.py` — dividir `registrar_erro_taxa()` em dois métodos: `registrar_erro_taxa()` (429/503, mantém a margem de segurança de 1,5x atual) e `registrar_erro_rede()` (timeout/hang, margem menor, ex. 1,15x, e só compromete o nível seguro depois de N ocorrências consecutivas, não na primeira).
- `coletor.py` — ao abandonar uma página (esgotou `MAX_TENTATIVAS_POR_PAGINA`), gravar o registro com `pendente_reconciliacao: true` e acumular `(modalidade, pagina)` numa lista `pendencias`; ao fim da varredura normal, se restar orçamento de tempo, fazer uma segunda passada revisitando só as `pendencias`.
- `escrever_resumo()` — reportar pendências não resolvidas mesmo depois da segunda passada, de forma destacada — nunca como "cobertura completa" se sobrou pendência.
- `README.md` — atualizar critério de aprovação para a rodada 3 (o que conta como aprovado agora é: zero perda silenciosa, não "zero erro").

## Order of work
1. `throttle.py`: separar os dois métodos de erro, com contadores e margens distintos.
2. `coletor.py`: registrar abandono com `pendente_reconciliacao: true` + acumular em `pendencias`.
3. `coletor.py`: segunda passada sobre `pendencias`, só se sobrar orçamento de tempo.
4. `escrever_resumo()`: seção nova "Pendências" — quantas existiram, quantas a segunda passada resolveu, quantas permaneceram.
5. `python -m py_compile` antes de qualquer execução real (os dois bugs da rodada 2 eram erro de sintaxe/lógica que isso já teria pego).
6. Smoke test curto (orçamento ~25-30s) antes da rodada completa — mesma disciplina que evitou o terceiro bug hoje.
7. Rodada completa (orçamento moderado, 10-15 min — não precisa dos 30 min da rodada 2, já sabemos que as 13 modalidades cabem em ~20 min).

## Risks
- Calibrar mal a margem de erro de rede pode fazer o throttle nunca reagir a timeout recorrente de verdade → mitigado pelo teto absoluto de espera (60s) e pelo limite de tentativas por página, que já existem e não mudam.
- A segunda passada pode não rodar se a primeira já consumir todo o orçamento → aceitável: só reduz a chance de resolver a pendência nesta execução, não quebra nada, e a pendência continua visível no resumo (não é perda silenciosa, é perda **declarada**).

## Proof
- `resumo.md` da rodada 3 tem uma seção "Pendências" nunca vazia por omissão — se zero pendência, diz isso explicitamente; se houver, lista quais `(modalidade, página)` ficaram sem dado, mesmo depois da segunda passada.
- Nenhuma modalidade pode aparecer como "coberta" se alguma página dela ficou pendente sem essa marcação visível no resumo.
