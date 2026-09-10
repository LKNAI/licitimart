"use server";

import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export interface OcorrenciaBusca {
  pagina: number | null;
  trecho: string;
  posicao: number;
}

// Pagina 1-indexada a partir de offsets de inicio de cada pagina
// (offsets[i] = onde a pagina i+1 comeca) -- busca binaria (RF-006,
// Fase M). Documento sem offsets (DOCX, sem paginacao fixa) retorna
// null -- nunca inventa numero de pagina.
function paginaDoIndice(indice: number, offsets: number[] | null): number | null {
  if (!offsets || offsets.length === 0) return null;
  let lo = 0;
  let hi = offsets.length - 1;
  let resultado = 0;
  while (lo <= hi) {
    const meio = Math.floor((lo + hi) / 2);
    if (offsets[meio] <= indice) {
      resultado = meio;
      lo = meio + 1;
    } else {
      hi = meio - 1;
    }
  }
  return resultado + 1;
}

const RAIO_CONTEXTO = 120;
const LIMITE_OCORRENCIAS = 20;

export async function buscarNoDocumento(documentoId: number, termo: string): Promise<{ erro: string; ocorrencias: OcorrenciaBusca[] }> {
  const termoLimpo = termo.trim();
  if (!termoLimpo) return { erro: "Digite um termo.", ocorrencias: [] };

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("documentos_contratacao")
    .select("texto_extraido, paginas_offsets")
    .eq("id", documentoId)
    .single();
  if (error || !data) return { erro: error?.message ?? "Documento não encontrado.", ocorrencias: [] };

  const texto = data.texto_extraido ?? "";
  const textoBusca = texto.toLowerCase();
  const alvo = termoLimpo.toLowerCase();

  const ocorrencias: OcorrenciaBusca[] = [];
  let posicao = 0;
  while (ocorrencias.length < LIMITE_OCORRENCIAS) {
    const indice = textoBusca.indexOf(alvo, posicao);
    if (indice === -1) break;
    const inicio = Math.max(0, indice - RAIO_CONTEXTO);
    const fim = Math.min(texto.length, indice + alvo.length + RAIO_CONTEXTO);
    ocorrencias.push({
      pagina: paginaDoIndice(indice, data.paginas_offsets),
      trecho: `${inicio > 0 ? "…" : ""}${texto.slice(inicio, fim)}${fim < texto.length ? "…" : ""}`,
      posicao: indice,
    });
    posicao = indice + alvo.length;
  }

  return { erro: "", ocorrencias };
}
