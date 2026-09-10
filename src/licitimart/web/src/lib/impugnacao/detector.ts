// Fase Q: porta de spikes/03_impugnacao_assistida/detector.py para o
// runtime Node -- MESMOS 8 padrões, mesma lógica (regex + palavra-chave,
// sem LLM). É um sinal inicial, não um substituto de análise jurídica
// (README do spike, RN-006): a Impugnação Assistida só pode chegar a
// cliente real depois de revisão de advogado, independente do resultado
// aqui. Escrito do zero para este projeto -- não é cópia do SAU.

export interface Achado {
  padrao: string;
  trecho: string;
  explicacao: string;
  fundamentacaoCandidata: string;
  aviso: string;
}

interface Padrao {
  nome: string;
  regex: RegExp;
  explicacao: string;
  fundamentacao: string;
  validadorExtra?: (m: RegExpMatchArray) => boolean;
}

const PADROES: Padrao[] = [
  {
    nome: "marca_especifica_sem_similar",
    regex: /\bmarca\s+([A-Z][\wÀ-ú]+)\b(?!.{0,40}(ou\s+similar|ou\s+equivalente|ou\s+de\s+qualidade\s+equivalente))/i,
    explicacao: "Exige marca específica sem admitir similar/equivalente.",
    fundamentacao:
      "Art. 41, I e art. 7º, §5º da Lei 14.133/2021 — vedação a especificação que direcione a marca ou fornecedor específico sem justificativa técnica.",
  },
  {
    nome: "atestado_percentual_alto",
    regex: /atestado[s]?.{0,60}(\d{2,3})\s*%\s*(do|da)\s+(valor|quantidade)/i,
    explicacao: "Exige atestado de capacidade técnica em percentual elevado do objeto licitado.",
    fundamentacao:
      "Art. 67, §3º da Lei 14.133/2021 e jurisprudência do TCU — exigência de atestado acima de 50% do objeto é indício de restrição indevida à competição, salvo justificativa técnica robusta.",
  },
  {
    nome: "prazo_entrega_curto_incompativel",
    regex: /prazo\s+de\s+entrega.{0,40}\b([1-9])\s*\(?\s*(um|dois|tr[êe]s)?\)?\s*dia[s]?\b/i,
    explicacao: "Prazo de entrega extremamente curto (poucos dias), possível indício de direcionamento.",
    fundamentacao:
      "Art. 40, X da Lei 14.133/2021 — prazo exíguo pode restringir a competição a fornecedor que já detenha estoque prévio, favorecendo incumbente.",
  },
  {
    nome: "certificacao_exclusiva",
    regex: /certifica[çc][ãa]o\s+exclusiva|certificado\s+emitido\s+exclusivamente/i,
    explicacao: "Exige certificação emitida por entidade única/exclusiva.",
    fundamentacao:
      "Art. 7º, §5º da Lei 14.133/2021 — exigência de certificação que só um fabricante/fornecedor possui é indício de direcionamento.",
  },
  {
    nome: "registro_uf_especifica",
    regex:
      /registro\s+(no|junto\s+ao)\s+(CREA|CRM|CRQ|CFT)[/\- ]?([A-Z]{2})\b(?!.{0,40}(qualquer\s+UF|de\s+qualquer\s+estado|em\s+qualquer\s+regi[ãa]o))/i,
    explicacao: "Exige registro profissional/técnico numa UF específica, sem admitir registro de outra UF com visto.",
    fundamentacao:
      "Art. 7º, §5º e art. 41 da Lei 14.133/2021 — exigir registro de conselho profissional restrito a uma UF, sem admitir visto de outro estado, restringe a competição a fornecedores locais sem justificativa técnica aparente.",
  },
  {
    nome: "atestado_unidade_indivisivel",
    regex: /atestado[s]?.{0,60}(em\s+um\s+[úu]nico\s+contrato|de\s+uma\s+[úu]nica\s+vez|em\s+uma\s+[úu]nica\s+nota\s+fiscal)/i,
    explicacao:
      "Exige que a capacidade técnica seja comprovada de uma só vez (um único contrato/nota), em vez de somar atestados de contratos diferentes.",
    fundamentacao:
      "Súmula 24 do TCU e jurisprudência consolidada — vedar o somatório de atestados de execuções distintas para comprovar quantitativo mínimo restringe indevidamente a competição, salvo justificativa técnica robusta quanto à indivisibilidade do objeto.",
  },
  {
    nome: "garantia_proposta_acima_limite",
    regex: /garantia\s+de\s+proposta.{0,40}(\d{1,2})\s*%/i,
    explicacao: "Exige garantia de proposta em percentual — checar se excede 1% do valor estimado (limite do art. 58, §2º).",
    fundamentacao: "Art. 58, §2º da Lei 14.133/2021 — a garantia de proposta não pode exceder 1% do valor estimado da contratação.",
    validadorExtra: (m) => Number(m[1]) > 1,
  },
  {
    nome: "visita_tecnica_obrigatoria_prazo_curto",
    regex:
      /visita\s+t[ée]cnica\s+obrigat[óo]ria[\s\S]{0,200}prazo\s+de\s+entrega.{0,40}\b([1-9])\s*\(?\s*(um|dois|tr[êe]s)?\)?\s*dia[s]?\b/i,
    explicacao:
      "Combina visita técnica obrigatória com prazo de entrega muito curto — pode inviabilizar participação de quem não tem presença prévia na região.",
    fundamentacao:
      "Art. 40, X c/c art. 7º, §5º da Lei 14.133/2021 — a combinação de exigências que, isoladamente, seriam razoáveis, pode se tornar restritiva quando soma barreiras de tempo e logística.",
  },
];

export function detectar(texto: string): Achado[] {
  const achados: Achado[] = [];
  for (const padrao of PADROES) {
    const m = texto.match(padrao.regex);
    if (!m) continue;
    if (padrao.validadorExtra && !padrao.validadorExtra(m)) continue;
    achados.push({
      padrao: padrao.nome,
      trecho: m[0],
      explicacao: padrao.explicacao,
      fundamentacaoCandidata: padrao.fundamentacao,
      aviso: "Candidato a achado — não é conclusão jurídica. Requer revisão humana (RN-006).",
    });
  }
  return achados;
}
