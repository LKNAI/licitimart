// Dado mock -- sem Supabase real configurado neste ambiente (ver
// plan.md e .env.example). O shape do tipo reflete RF-006 (dossiê
// estruturado), RF-007 (Go/No-Go/Revisão Humana como resultado de
// primeira classe, ERS secao 4.1), RF-019 (Selo de Confiabilidade) e
// RF-020 (estados nao-conclusivos exibidos explicitamente, nunca
// escondidos atras de um score bonito).

export type Veredito = "go" | "no_go" | "revisao_humana";
export type Confiabilidade = "confirmado" | "fonte_unica" | "divergente";

export interface Achado {
  criterio: string;
  achado: string;
  citacao: string;
  pagina: number;
  confianca: "confirmada" | "dado_insuficiente";
}

export interface ItemLicitacao {
  descricao: string;
  quantidade: number;
  valorUnitarioEstimado: number;
}

export interface Dossie {
  id: string;
  numeroControlePNCP: string;
  orgao: string;
  objeto: string;
  modalidade: string;
  valorEstimado: number;
  dataPublicacao: string;
  veredito: Veredito;
  confiabilidade: Confiabilidade;
  itens: ItemLicitacao[];
  achados: Achado[];
}

export const DOSSIES_MOCK: Dossie[] = [
  {
    id: "1",
    numeroControlePNCP: "00394544000185-1-000206/2026",
    orgao: "Secretaria Municipal de Saúde — Exemplo/UF",
    objeto: "Aquisição de equipamentos de diagnóstico por imagem",
    modalidade: "Pregão — Eletrônico",
    valorEstimado: 1_240_000,
    dataPublicacao: "2026-08-14",
    veredito: "go",
    confiabilidade: "confirmado",
    itens: [
      { descricao: "Aparelho de ultrassom portátil", quantidade: 4, valorUnitarioEstimado: 180_000 },
      { descricao: "Monitor multiparamétrico", quantidade: 10, valorUnitarioEstimado: 52_000 },
    ],
    achados: [
      {
        criterio: "Aderência ao portfólio cadastrado",
        achado: "Especificação técnica compatível com os itens do catálogo do tenant.",
        citacao: "O equipamento deverá possuir resolução mínima de 128 canais e certificação Anvisa vigente.",
        pagina: 12,
        confianca: "confirmada",
      },
    ],
  },
  {
    id: "2",
    numeroControlePNCP: "00394544000185-1-000287/2026",
    orgao: "Prefeitura Municipal — Exemplo/UF",
    objeto: "Contratação de serviço de manutenção predial",
    modalidade: "Concorrência — Eletrônica",
    valorEstimado: 860_000,
    dataPublicacao: "2026-08-20",
    veredito: "revisao_humana",
    confiabilidade: "fonte_unica",
    itens: [
      { descricao: "Serviço de manutenção elétrica preventiva", quantidade: 12, valorUnitarioEstimado: 18_000 },
    ],
    achados: [
      {
        criterio: "Exigência de atestado de capacidade técnica",
        achado: "Percentual exigido está no limite do que a jurisprudência do TCU trata como aceitável — requer avaliação humana.",
        citacao: "atestados de capacidade técnica correspondentes a, no mínimo, 45% do valor total estimado",
        pagina: 8,
        confianca: "confirmada",
      },
      {
        criterio: "Regularidade fiscal do órgão comprador",
        achado: "",
        citacao: "",
        pagina: 0,
        confianca: "dado_insuficiente",
      },
    ],
  },
  {
    id: "3",
    numeroControlePNCP: "00394544000185-1-000301/2026",
    orgao: "Secretaria Estadual de Educação — Exemplo/UF",
    objeto: "Aquisição de mobiliário escolar",
    modalidade: "Pregão — Eletrônico",
    valorEstimado: 430_000,
    dataPublicacao: "2026-08-22",
    veredito: "no_go",
    confiabilidade: "divergente",
    itens: [
      { descricao: "Carteira escolar universitária", quantidade: 2000, valorUnitarioEstimado: 210 },
    ],
    achados: [
      {
        criterio: "Direcionamento por marca específica",
        achado: "Especificação cita marca sem admitir similar/equivalente — possível restrição indevida à competição.",
        citacao: "carteiras universitárias modelo Confortto CU-500, não sendo aceitos produtos de outras marcas",
        pagina: 5,
        confianca: "confirmada",
      },
    ],
  },
];

export function buscarDossie(id: string): Dossie | undefined {
  return DOSSIES_MOCK.find((d) => d.id === id);
}

export const ROTULO_VEREDITO: Record<Veredito, string> = {
  go: "Go",
  no_go: "No-Go",
  revisao_humana: "Revisão Humana",
};

export const ROTULO_CONFIABILIDADE: Record<Confiabilidade, string> = {
  confirmado: "Confirmado (fontes concordam)",
  fonte_unica: "Fonte única",
  divergente: "Divergente entre fontes",
};
