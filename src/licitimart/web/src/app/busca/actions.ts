"use server";

import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import { embutirTexto, formatarParaPgvector } from "@/lib/embedding";
import { buscarPaginasSemelhantes } from "@/lib/data/dossiesSupabase";

export interface ResultadoBusca {
  id: number;
  numero_controle_pncp: string;
  objeto: string | null;
  orgao: string | null;
  municipio_uf: string | null;
  score: number;
}

export interface ResultadoPagina {
  contratacaoId: number;
  documentoId: number;
  pagina: number | null;
  trecho: string;
  objeto: string | null;
  orgao: string | null;
}

export async function buscar(
  formData: FormData
): Promise<{ erro: string; resultados: ResultadoBusca[]; paginas: ResultadoPagina[] }> {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { erro: "Digite um termo de busca.", resultados: [], paginas: [] };

  const vetor = await embutirTexto(texto);
  const embeddingPg = formatarParaPgvector(vetor);
  const supabase = await criarClienteSupabaseServer();

  // Fase S: duas buscas em paralelo -- contratações (objeto, já
  // existia) e páginas de edital extraído (novo, RF-005 estendido).
  const [respostaContratacoes, paginasEncontradas] = await Promise.all([
    supabase.rpc("buscar_contratacoes_hibrida", { p_texto: texto, p_embedding: embeddingPg, p_limite: 20 }),
    buscarPaginasSemelhantes(texto, embeddingPg),
  ]);

  if (respostaContratacoes.error) return { erro: respostaContratacoes.error.message, resultados: [], paginas: [] };

  // As páginas só trazem contratacaoId -- busca objeto/orgao pra exibir
  // (mesmo padrão de qualquer outra tela, poucos ids, uma query extra).
  const idsContratacoes = [...new Set(paginasEncontradas.map((p) => p.contratacaoId))];
  const contratacoesPorId = new Map<number, { objeto: string | null; orgao: string | null }>();
  if (idsContratacoes.length > 0) {
    const { data: linhas } = await supabase
      .from("contratacoes")
      .select("id, objeto, orgao")
      .in("id", idsContratacoes);
    for (const l of linhas ?? []) contratacoesPorId.set(l.id, { objeto: l.objeto, orgao: l.orgao });
  }

  const paginas: ResultadoPagina[] = paginasEncontradas.map((p) => ({
    contratacaoId: p.contratacaoId,
    documentoId: p.documentoId,
    pagina: p.pagina,
    trecho: p.trecho,
    objeto: contratacoesPorId.get(p.contratacaoId)?.objeto ?? null,
    orgao: contratacoesPorId.get(p.contratacaoId)?.orgao ?? null,
  }));

  return { erro: "", resultados: respostaContratacoes.data ?? [], paginas };
}
