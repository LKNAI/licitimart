# LICITIMART — Especificação de Requisitos de Software

**Versão 1.0 — Edição revisada a partir da experiência de produção do SAU.** Setembro/2026.

> **Cópia de referência, não editável.** A versão canônica (HTML/PDF/DOCX, com formatação completa) fica em `Planejamento/ERS_Licitimart_v1_Claude.*` no diretório pai deste repositório. Esta cópia em Markdown existe só para consulta rápida por quem está lendo código, e pode ficar defasada — se houver dúvida, checar a versão canônica.

> **Nota de autoria.** Este documento não é uma correção do ERS v1.2 (Gemini, Set/2026) — é uma reescrita, elaborada a partir da avaliação comparativa entre aquele documento e o que o workspace SAU tem de fato construído e testado em produção sobre a mesma matéria-prima (publicações do PNCP sob a Lei 14.133/2021). Onde a versão anterior descrevia um recurso em uma frase, este documento tenta responder à pergunta seguinte — "e quando essa fonte de dado se comportar mal, o que o sistema faz?" — porque essa pergunta, no caso do SAU, sempre teve resposta cara.

## 1. Introdução

### 1.1 Propósito e escopo da versão 1
Conectar o fluxo de contratações públicas brasileiras à decisão de venda privada: ingerir editais, extrair sua estrutura, avaliar aderência ao portfólio do cliente e recomendar disputar ou não — com prova, não com opinião. Cobertura de fontes deliberadamente menor do que a visão de longo prazo (1.2), com dois módulos novos de diferencial: Impugnação Assistida e Diff de Retificação.

### 1.2 Fora de escopo da versão 1
- Portais estaduais e os ~5.500 portais municipais — PNCP em profundidade + Comprasnet como reconciliação apenas; expansão municipal faseada em v2/v3.
- OCR de escaneado em escala plena — entra como capacidade orçada e mensurável, não "incluída".
- Radar de concorrência, market share, monitoramento de fabricante/SKU, auditoria de canal de vendas — v2/v3.
- Customização de pesos de scoring pelo tenant — v2.

### 1.3 Definições e acrônimos
- **PNCP** — Portal Nacional de Contratações Públicas (Lei 14.133/2021), fonte primária da v1.
- **Go / No-Go / Revisão Humana** — os três veredictos do motor de decisão; Revisão Humana é resultado esperado, não excepcional.
- **Selo de Confiabilidade** — indicador visível de procedência: fonte, timestamp, concordância entre fontes.
- **Dado Insuficiente** — estado explícito quando falta base para avaliar; nunca inferido como "requisito não cumprido".
- **Impugnação Assistida** — minuta de contestação, sempre rascunho pendente de revisão jurídica humana.
- **Manifesto de Ingestão** — registro versionado por lote: consulta, contagens, hash do payload.

## 2. Descrição geral

### 2.1 Proposta de valor e diferenciação
1. Ataque, não só triagem — detectar restritividade e já gerar minuta de impugnação.
2. Velocidade sobre mudança — retificação de edital como evento de primeira classe, com diff e alerta.
3. Confiabilidade exposta — procedência visível; divergência entre fontes mostrada, não escondida.
4. Honestidade sobre certeza — "dado insuficiente" em vez de nota forçada de 0 a 100.

### 2.2 Perfis de usuários
| Perfil | Responsabilidade | Interações |
|---|---|---|
| PU-01: Analista de Licitação | Conferência operacional/técnica | Dossiês, checklist, revisão de "Revisão Humana" |
| PU-02: Gestor Comercial | Pipeline e metas | Score, volume, prazos |
| PU-03: Jurídico/Compliance do Cliente | Revisão e protocolo de impugnações | Aprova/edita minutas do AG-06; arquiva dossiês |
| PU-04: Administrador Tenant | Conta e conformidade | Catálogos, atestados, teto de tokens |
| PU-05: Admin Licitimart | Infra e qualidade de dados | Saúde de conectores, divergência entre fontes |

### 2.3 Stack (ajustes em relação à proposta original)
- Ingestão: microserviço Python com **throttling adaptativo por fonte** de primeira classe.
- OCR: motor nomeado e orçado por página (não apenas bibliotecas de PDF nato-digital).
- LLM: validação de citação por **substring literal** como etapa obrigatória do pipeline.
- Resto da stack (Next.js/Supabase/Cloud Run/Inngest/Sentry) mantido como no original.

### 2.4 Premissas e restrições técnicas
- PNCP é fonte de verdade de cobertura; outras fontes só reconciliam, nunca preenchem lacuna silenciosamente.
- Endpoint cumulativo por data de publicação, nunca "retrato do dia", para censo.
- Identificação de arquivo por assinatura binária, nunca por Content-Type/extensão.
- Paralelismo contra uma mesma fonte é risco por padrão, não alavanca de performance.

## 3. Arquitetura de dados

### 3.1 Fontes na v1
PNCP (primária) · Comprasnet/dados abertos (reconciliação, nunca primária) · estaduais/municipais (fora de escopo v1).

### 3.2 Regras de ingestão
1. Cumulativo, não retrato do dia.
2. Throttling adaptativo por fonte, nunca por worker isolado.
3. Identificação de arquivo por assinatura binária.
4. Casamento por identificador estruturado, nunca por string digitada.

### 3.3 Procedência e versionamento
Manifesto por lote (consulta, contagem, hash do payload); toda linha carrega fonte e timestamp individualmente.

### 3.4 Reconciliação multi-fonte e Selo de Confiabilidade
Três estados exibidos: **confirmado** (fontes concordam) · **fonte única** (só uma cobre) · **divergente** (discordância registrada e propagada como baixa confiança, nunca resolvida por prioridade fixa silenciosa).

## 4. Arquitetura de agentes de IA

### 4.1 Princípios de governança
1. Nenhum agente decide Go/No-Go sem citação validada por substring literal.
2. "Revisão Humana" é resultado de primeira classe, não fallback de erro.
3. Ausência de dado é "não localizado"/"dado insuficiente", nunca "requisito não cumprido".

### 4.2 Agentes
AG-01 Triagem Semântica · AG-02 Pontuação · AG-03 Análise Técnica · AG-04 Jurídico e Habilitação · AG-05 Motor de Decisão · **AG-06 Impugnação Assistida (novo)** · **AG-07 Reconciliação de Fontes (novo)**.

## 5–10. Requisitos, regras de negócio, modelo de negócio, roadmap, matriz

Ver a versão canônica em `Planejamento/ERS_Licitimart_v1_Claude.html` (ou `.pdf`/`.docx`) para as tabelas completas de RF-001 a RF-020, RNF-001 a RNF-014, RN-001 a RN-006, o roadmap v1/v2/v3 e a matriz de rastreabilidade estratégica — reproduzi-las aqui duplicaria manutenção sem ganho.

## Nota final

A diferença mais importante entre este documento e a proposta original não está em nenhuma linha específica — está no tratamento de "o que fazer quando a fonte de dado, ou a própria IA, se comportar mal". Este documento assume que a fonte vai falhar sob carga, que citação precisa ser verificada e não só formatada, e que escala geográfica é o maior risco do roadmap, não o menor.
