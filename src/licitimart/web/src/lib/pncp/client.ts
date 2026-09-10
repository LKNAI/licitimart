// Fase N: caminho on-demand -- porta de src/licitimart/ingestao/pncp.py
// (buscar_itens/buscar_arquivos/baixar_arquivo) para o runtime Node do
// Next.js. Só as chamadas de UMA contratação por vez (1 clique = 1-2
// requisições) -- não é varredura em lote, então não precisa do
// ThrottleComDescoberta usado em scripts/varredura_nacional.py; espaça
// as duas chamadas (itens + arquivos) com um respiro fixo pequeno só
// por cortesia, sem pretender ser um limitador de taxa de verdade.
const BASE_URL_ITENS = "https://pncp.gov.br/api/pncp/v1";

const REGEX_NUMERO_CONTROLE = /^(\d{14})-\d+-(\d+)\/(\d{4})$/;

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// numero_controle_pncp vem no formato "{cnpj:14}-{1}-{sequencial}/{ano}"
// -- mesmo parse de _parsear_numero_controle em pncp.py. Levanta erro
// claro em vez de seguir com um parse parcial que pareça ter funcionado.
export function parsearNumeroControle(numeroControlePncp: string): { cnpj: string; sequencial: number; ano: number } {
  const m = REGEX_NUMERO_CONTROLE.exec(numeroControlePncp);
  if (!m) {
    throw new Error(`numero_controle_pncp fora do formato esperado: ${numeroControlePncp}`);
  }
  const [, cnpj, sequencial, ano] = m;
  return { cnpj, sequencial: Number(sequencial), ano: Number(ano) };
}

export interface ItemPncp {
  descricao?: string;
  quantidade?: number;
  valorUnitarioEstimado?: number;
}

export interface ArquivoPncp {
  sequencialDocumento: number;
  titulo: string;
  tipoDocumentoNome?: string;
  url: string;
}

// Retorna null em erro/instabilidade (nunca lista vazia com sentido
// ambíguo) -- mesma convenção do lado Python.
export async function buscarItens(numeroControlePncp: string): Promise<ItemPncp[] | null> {
  const { cnpj, sequencial, ano } = parsearNumeroControle(numeroControlePncp);
  const url = `${BASE_URL_ITENS}/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (resp.status === 200) return await resp.json();
    // Contratação sem item cadastrado no PNCP -- estado real, não erro.
    if (resp.status === 404) return [];
    return null;
  } catch {
    return null;
  }
}

export async function buscarArquivos(numeroControlePncp: string): Promise<ArquivoPncp[] | null> {
  const { cnpj, sequencial, ano } = parsearNumeroControle(numeroControlePncp);
  const url = `${BASE_URL_ITENS}/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (resp.status === 200) return await resp.json();
    if (resp.status === 404) return [];
    return null;
  } catch {
    return null;
  }
}

export async function baixarArquivo(url: string): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (resp.status !== 200) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
}

export async function respiro() {
  await esperar(400);
}
