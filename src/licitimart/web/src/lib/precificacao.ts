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
