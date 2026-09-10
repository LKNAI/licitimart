// Fase D: contratacoes vem do Supabase real (tabela publica, RLS exige
// so autenticacao -- nao tenant). Substitui o JSON de ponte da Fase A
// (dossiesReais.ts / scripts/exportar_para_webapp.py), que fica mantido
// como fallback historico mas nao e mais lido por /dossies.
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import type { Dossie } from "@/lib/mock/dossies";

export interface MetadadoContratacoes {
  disponivel: boolean;
  total: number;
}

export async function carregarDossiesSupabase(): Promise<{ dossies: Dossie[]; metadado: MetadadoContratacoes }> {
  const supabase = await criarClienteSupabaseServer();
  const { data, error, count } = await supabase
    .from("contratacoes")
    .select("id, numero_controle_pncp, orgao, municipio_uf, objeto, modalidade, valor_estimado, data_publicacao, confiabilidade", { count: "exact" })
    .order("data_publicacao", { ascending: false })
    .limit(1000);

  if (error || !data) {
    return { dossies: [], metadado: { disponivel: false, total: 0 } };
  }

  const dossies: Dossie[] = data.map((row) => ({
    id: `real-${row.id}`,
    numeroControlePNCP: row.numero_controle_pncp,
    orgao: `${row.orgao ?? "Órgão não informado"} — ${row.municipio_uf ?? ""}`,
    objeto: row.objeto ?? "(objeto não informado)",
    modalidade: row.modalidade ?? "(modalidade não informada)",
    valorEstimado: row.valor_estimado ?? 0,
    dataPublicacao: row.data_publicacao ?? new Date().toISOString(),
    veredito: "revisao_humana",
    confiabilidade: (row.confiabilidade as Dossie["confiabilidade"]) ?? "fonte_unica",
    itens: [],
    achados: [],
    origem: "pncp_real",
  }));

  return { dossies, metadado: { disponivel: true, total: count ?? dossies.length } };
}
