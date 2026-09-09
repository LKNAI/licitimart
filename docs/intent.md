# Intent: Licitimart — SaaS de inteligência de licitações

**Autor:** LKN. **Status:** aceito (produto em construção — fase de spikes de risco).

## Problema

Empresas que vendem para o setor público brasileiro (~R$ 1 trilhão/ano em contratações) precisam encontrar, entre milhares de editais publicados por dia em dezenas de portais diferentes, quais vale a pena disputar — e hoje isso é feito por triagem manual ou por radares que só indexam e notificam, sem julgamento de aderência técnica/jurídica nem prova do que encontraram.

Havia uma primeira especificação (ERS v1.2, elaborada em outra ferramenta) para resolver isso, mas ela nunca foi confrontada com experiência real de produção sobre a mesma fonte de dado (o PNCP). Existe, no mesmo diretório de projetos, um sistema em produção — o SAU — que lê essa fonte há meses para um propósito diferente (auditoria de compliance, não venda) e já pagou o preço de descobrir, na prática, onde a fonte se comporta mal. A pergunta que deu origem a este projeto foi: **o que dessa experiência é reaproveitável, e o que na especificação original ignorava riscos que já foram vividos por um vizinho?**

## Resultado proposto

Uma plataforma que ingere o PNCP (fonte primária da v1), extrai a estrutura dos editais, avalia aderência ao portfólio do cliente e recomenda disputar ou não — sempre com citação rastreável até a página exata do documento, nunca uma nota sem prova. Diferencial de mercado: a mesma lente que audita conformidade também gera minuta de impugnação para cláusula restritiva (Impugnação Assistida) e alerta em tempo real quando um edital já publicado é alterado (Diff de Retificação) — nenhum dos dois existe em radar de licitação genérico.

A v1 é deliberadamente mais estreita que a ambição do produto: cobre só PNCP em profundidade, não os ~5.500 portais municipais nem OCR pleno nem inteligência de mercado (radar de concorrência, market share) — esses ficam para v2/v3, depois que os fundamentos estiverem validados com dado real, não suposição.

## Usuários e sistemas afetados

Analista de licitação, gestor comercial e jurídico/compliance do cliente (as três pontas que consomem o dossiê e a impugnação); administrador do tenant (catálogos, teto de tokens); administrador da Licitimart (saúde dos conectores). Sistemas: PNCP (fonte primária), Comprasnet/dados abertos (reconciliação, nunca fonte primária) — ver `spec.md` para o porquê dessa hierarquia.

## Restrições

- Nenhum código do SAU é copiado literalmente — só padrões e lições, documentados, nunca implementação.
- Nenhuma suposição herdada de outro contexto (o piso de 0,35s de throttling do SAU, por exemplo) é aceita sem reteste — o spike 01 já provou que não se sustentava aqui.
- RN-006: Impugnação Assistida nunca chega a cliente real sem revisão jurídica formal, independente do resultado técnico dos spikes.
- Equipe de um único desenvolvedor — toda decisão de escopo da v1 prioriza validar premissa de risco antes de construir em volume.

## Perguntas abertas

- Qual o motor de OCR (RF-002) e o orçamento de custo/acurácia por página — ainda não decidido, fora do escopo dos spikes atuais.
- A taxa de citação literalmente válida de um LLM real (spike 02) — pendente de `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`, não configurada neste ambiente.
- Qual o primeiro nicho/vertical de lançamento (o texto original falava do mercado geral; a proposta de valor de uma v1 restrita a PNCP favorece escolher um recorte estreito primeiro) — decisão de negócio, não técnica, ainda não tomada.

---
**Segue para:** `docs/ERS_Licitimart_v1.md` (o `spec.md` deste projeto — requisitos, arquitetura, RF/RNF completos).
