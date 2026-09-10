// Fase D: contratacoes vem do Supabase real (tabela publica, RLS exige
// so autenticacao -- nao tenant). Substitui o JSON de ponte da Fase A
// (dossiesReais.ts / scripts/exportar_para_webapp.py), que fica mantido
// como fallback historico mas nao e mais lido por /dossies.
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import type { Dossie, ItemLicitacao } from "@/lib/mock/dossies";

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

  // Veredito e por tenant, nunca global (Fase G) -- a mesma contratacao
  // pode ser "Go" para um tenant e "No-Go" para outro. So buscamos as
  // analises do tenant do usuario logado; quem nao tem analise ainda
  // cai no default "revisao_humana" (mesmo default da coluna no banco).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const veredictosPorContratacao = new Map<number, Dossie["veredito"]>();
  if (user) {
    const { data: membresia } = await supabase
      .from("tenant_membros")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (membresia) {
      const { data: analises } = await supabase
        .from("analises")
        .select("contratacao_id, veredito")
        .eq("tenant_id", membresia.tenant_id);
      for (const a of analises ?? []) {
        veredictosPorContratacao.set(a.contratacao_id, a.veredito as Dossie["veredito"]);
      }
    }
  }

  // Itens reais (RF-008/backfill parcial via scripts/backfill_itens.py --
  // ainda nao cobre as 100% das contratacoes, so quem ja foi processado).
  const { data: itensRows } = await supabase
    .from("itens_licitacao")
    .select("contratacao_id, descricao, quantidade, valor_unitario_estimado")
    .in("contratacao_id", data.map((row) => row.id));
  const itensPorContratacao = new Map<number, ItemLicitacao[]>();
  for (const item of itensRows ?? []) {
    const lista = itensPorContratacao.get(item.contratacao_id) ?? [];
    lista.push({
      descricao: item.descricao,
      quantidade: item.quantidade ?? 0,
      valorUnitarioEstimado: item.valor_unitario_estimado ?? 0,
    });
    itensPorContratacao.set(item.contratacao_id, lista);
  }

  const dossies: Dossie[] = data.map((row) => ({
    id: `real-${row.id}`,
    numeroControlePNCP: row.numero_controle_pncp,
    orgao: `${row.orgao ?? "Órgão não informado"} — ${row.municipio_uf ?? ""}`,
    objeto: row.objeto ?? "(objeto não informado)",
    modalidade: row.modalidade ?? "(modalidade não informada)",
    valorEstimado: row.valor_estimado ?? 0,
    dataPublicacao: row.data_publicacao ?? new Date().toISOString(),
    veredito: veredictosPorContratacao.get(row.id) ?? "revisao_humana",
    confiabilidade: (row.confiabilidade as Dossie["confiabilidade"]) ?? "fonte_unica",
    itens: itensPorContratacao.get(row.id) ?? [],
    achados: [],
    origem: "pncp_real",
  }));

  return { dossies, metadado: { disponivel: true, total: count ?? dossies.length } };
}

export interface DocumentoContratacao {
  id: number;
  titulo: string | null;
  tipoDocumento: string | null;
  statusExtracao: "extraido_nativo" | "requer_ocr" | "erro";
  paginas: number | null;
}

// RF-002 -- documentos reais (backfill parcial via scripts/backfill_documentos.py).
export async function buscarDocumentosContratacao(contratacaoIdReal: number): Promise<DocumentoContratacao[]> {
  const supabase = await criarClienteSupabaseServer();
  const { data } = await supabase
    .from("documentos_contratacao")
    .select("id, titulo, tipo_documento, status_extracao, paginas")
    .eq("contratacao_id", contratacaoIdReal);
  return (data ?? []).map((row) => ({
    id: row.id,
    titulo: row.titulo,
    tipoDocumento: row.tipo_documento,
    statusExtracao: row.status_extracao as DocumentoContratacao["statusExtracao"],
    paginas: row.paginas,
  }));
}

// RF-008 -- itens de QUALQUER contratação real com a mesma descrição
// exata, para servir de amostra ao cálculo de faixa de preço
// (src/lib/precificacao.ts). Dado público, sem escopo de tenant --
// preço homologado de edital é fato do mercado, não segredo de negócio.
export async function buscarItensComparaveis(descricoes: string[]): Promise<{ descricao: string; valorUnitarioEstimado: number }[]> {
  if (descricoes.length === 0) return [];
  const supabase = await criarClienteSupabaseServer();
  const { data } = await supabase
    .from("itens_licitacao")
    .select("descricao, valor_unitario_estimado")
    .in("descricao", descricoes);
  return (data ?? []).map((row) => ({
    descricao: row.descricao,
    valorUnitarioEstimado: row.valor_unitario_estimado ?? 0,
  }));
}
