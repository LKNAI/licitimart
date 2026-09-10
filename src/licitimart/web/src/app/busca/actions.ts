"use server";

import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import { embutirTexto, formatarParaPgvector } from "@/lib/embedding";

export interface ResultadoBusca {
  id: number;
  numero_controle_pncp: string;
  objeto: string | null;
  orgao: string | null;
  municipio_uf: string | null;
  score: number;
}

export async function buscar(formData: FormData): Promise<{ erro: string; resultados: ResultadoBusca[] }> {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { erro: "Digite um termo de busca.", resultados: [] };

  const vetor = await embutirTexto(texto);
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase.rpc("buscar_contratacoes_hibrida", {
    p_texto: texto,
    p_embedding: formatarParaPgvector(vetor),
    p_limite: 20,
  });
  if (error) return { erro: error.message, resultados: [] };
  return { erro: "", resultados: data ?? [] };
}
