// RF-008 -- Consultor de Precificacao, escopo desta fase: correspondencia
// por texto EXATO de descricao, nao busca semantica (isso e o problema de
// RF-005, nao construido ainda). Com poucos itens reais coletados e
// descricao livre (texto do orgao, nao SKU padronizado), a maioria vai
// cair em "dado insuficiente" -- isso e honesto (RF-020), nao um defeito:
// nunca fabricar uma faixa de preco com 1-2 amostras.
export interface ItemComPreco {
  descricao: string;
  valorUnitarioEstimado: number;
}

export type FaixaPreco =
  | { status: "insuficiente"; amostras: number }
  | { status: "calculada"; amostras: number; minimo: number; mediana: number; maximo: number };

const AMOSTRAS_MINIMAS = 3;

function mediana(valoresOrdenados: number[]): number {
  const n = valoresOrdenados.length;
  const meio = Math.floor(n / 2);
  return n % 2 === 0 ? (valoresOrdenados[meio - 1] + valoresOrdenados[meio]) / 2 : valoresOrdenados[meio];
}

export function calcularFaixaPreco(itens: ItemComPreco[], descricaoAlvo: string): FaixaPreco {
  const valores = itens
    .filter((i) => i.descricao === descricaoAlvo && i.valorUnitarioEstimado > 0)
    .map((i) => i.valorUnitarioEstimado)
    .sort((a, b) => a - b);

  if (valores.length < AMOSTRAS_MINIMAS) {
    return { status: "insuficiente", amostras: valores.length };
  }

  return {
    status: "calculada",
    amostras: valores.length,
    minimo: valores[0],
    mediana: mediana(valores),
    maximo: valores[valores.length - 1],
  };
}

// Fase P -- versao semantica (RF-008 completo): em vez de exigir string
// identica de descricao, aceita itens dentro de um raio de distancia de
// cosseno (embedding de item, nao de contratacao inteira -- ver
// plan_fase_p.md). DISTANCIA_MAXIMA e um teto, nao so a contagem minima
// de amostras -- sem ele, "top-N mais proximos" viraria "N itens
// quaisquer" quando a base tem poucos itens parecidos de verdade.
//
// Testado contra dado real (Fase P): com 0.35, itens claramente
// diferentes entravam como "comparaveis" -- ex. "pavimentacao com
// pedras de basalto" (alvo) casando com "arame galvanizado fio14"
// (R$22) e "cercamento ligacao de agua provisoria" (R$775) por
// vocabulario generico de "obras e servicos de engenharia" em comum,
// nao por serem o mesmo tipo de item. Descricao de ITEM (curta,
// telegrafica) nao separa por tipo de produto/servico do mesmo jeito
// que objeto.descricao (frase completa) separava na busca semantica de
// RF-005 -- por isso o corte aqui e bem mais apertado. Com a base atual
// (119 itens, heterogenea), isso frequentemente cai em "dado
// insuficiente" -- honesto (RF-020), nao um defeito: corpus pequeno tem
// poucos itens genuinamente parecidos.
const DISTANCIA_MAXIMA = 0.2;

export interface ItemComDistancia {
  descricao: string;
  valorUnitarioEstimado: number;
  distancia: number;
}

export function calcularFaixaPrecoSemantica(itens: ItemComDistancia[]): FaixaPreco {
  const valores = itens
    .filter((i) => i.distancia <= DISTANCIA_MAXIMA && i.valorUnitarioEstimado > 0)
    .map((i) => i.valorUnitarioEstimado)
    .sort((a, b) => a - b);

  if (valores.length < AMOSTRAS_MINIMAS) {
    return { status: "insuficiente", amostras: valores.length };
  }

  return {
    status: "calculada",
    amostras: valores.length,
    minimo: valores[0],
    mediana: mediana(valores),
    maximo: valores[valores.length - 1],
  };
}
