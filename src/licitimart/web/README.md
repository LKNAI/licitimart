# Licitimart — web (esqueleto v1)

Next.js 15 (App Router, TypeScript, Tailwind). Ver `plan.md` para o que foi decidido e por quê.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencher com um projeto Supabase real quando existir
npm run dev
```

## O que é real vs. mock, hoje

- **Real:** estrutura de rotas (`/`, `/dossies`, `/dossies/[id]`, `/pipeline`), tipagem (`src/lib/mock/dossies.ts`), clientes Supabase (`src/lib/supabase/`) — já exigem env var real, sem fallback silencioso.
- **Mock:** todo o dado exibido nas três rotas (`DOSSIES_MOCK`). Nenhuma tela afirma dado real — sempre há aviso visível ("esqueleto v1 — dado mock" no cabeçalho, e "(mock)" em botões de ação).

## O que falta (não é bug, é próximo passo)

- Projeto Supabase real (`.env.local` vazio hoje).
- Autenticação (RNF-007 RBAC) — nenhuma tela pede login ainda.
- Conectar `/dossies` ao dado real de `src/licitimart/ingestao/` (hoje são mundos separados: Python ingerindo, TypeScript mostrando mock).
- Navegação "abrir na página exata" (RNF-010) — hoje é um botão mock; depende do spike 02 ter uma citação validada por LLM real para apontar.
- Impugnação Assistida (RF-017) na UI — depende do spike 03 avançar (ver `spikes/03_impugnacao_assistida/`).
