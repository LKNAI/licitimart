# Licitimart — web (esqueleto v1)

Next.js 15 (App Router, TypeScript, Tailwind). Ver `plan.md` para o que foi decidido e por quê.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencher com um projeto Supabase real quando existir
npm run dev
```

## O que é real vs. mock, hoje

- **Real:** estrutura de rotas (`/`, `/dossies`, `/dossies/[id]`, `/pipeline`), tipagem (`src/lib/mock/dossies.ts`), clientes Supabase (`src/lib/supabase/`) — já exigem env var real, sem fallback silencioso. **913 dos dossiês em `/dossies` são dado real do PNCP** (`src/lib/data/contratacoes_pncp.json`, gerado por `scripts/exportar_para_webapp.py` — ver `plan.md`, "Fase A"), sempre com veredito "Revisão Humana" porque nenhuma análise foi feita sobre eles ainda.
- **Mock:** só os 3 dossiês ilustrativos (`DOSSIES_MOCK`) — existem para mostrar como a tela fica quando há análise de IA (Go/No-Go, achados, citação). Toda linha/tela mostra o rótulo de origem (`ROTULO_ORIGEM`) — real e mock nunca se misturam sem essa distinção visível.

## Para atualizar o dado real

```bash
cd ../../..   # raiz do projeto
python scripts/exportar_para_webapp.py
```

Reescreve `src/lib/data/contratacoes_pncp.json`. Respeita o throttle de descoberta empírica e a fila de pendências do `src/licitimart/ingestao/` — não rode em loop nem baixe o orçamento sem necessidade.

## O que falta (não é bug, é próximo passo)

- Projeto Supabase real (`.env.local` vazio hoje).
- Autenticação (RNF-007 RBAC) — nenhuma tela pede login ainda.
- ~~Conectar `/dossies` ao dado real de `src/licitimart/ingestao/`~~ — feito (Fase A, `scripts/exportar_para_webapp.py`). Falta automatizar a cadência (hoje é manual) e ampliar o escopo coletado.
- Navegação "abrir na página exata" (RNF-010) — hoje é um botão mock; depende do spike 02 ter uma citação validada por LLM real para apontar.
- Impugnação Assistida (RF-017) na UI — depende do spike 03 avançar (ver `spikes/03_impugnacao_assistida/`).
