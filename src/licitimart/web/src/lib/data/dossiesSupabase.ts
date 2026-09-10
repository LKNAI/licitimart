// Fase D: contratacoes vem do Supabase real (tabela publica, RLS exige
// so autenticacao -- nao tenant). Substitui o JSON de ponte da Fase A
// (dossiesReais.ts / scripts/exportar_para_webapp.py), que fica mantido
// como fallback historico mas nao e mais lido por /dossies.
//
// Fase O: com o volume real (11k+ contratacoes), carregar tudo (ou ate
// 1.000) em memoria por requisicao deixou de fazer sentido -- ver
// plan_fase_o.md. `carregarDossiesSupabase` (capada em 1.000) continua
// existindo só pra quem ainda precisa da lista inteira em memória; as
// telas de volume (`/dossies`, `/metricas`, `/pipeline`) e o detalhe
// (`/dossies/[id]`) usam as funções novas abaixo, que buscam só o que a
// tela precisa (uma página, um agregado SQL, um registro por id).
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import type { Dossie, ItemLicitacao, Veredito } from "@/lib/mock/dossies";

export interface MetadadoContratacoes {
  disponivel: boolean;
  total: number;
}

// Descobre o tenant do usuário logado (mesmo padrão repetido em várias
// telas) -- null se não estiver logado ou sem tenant ainda (onboarding).
async function buscarTenantIdDoUsuario(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>
): Promise<number | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  return membresia?.tenant_id ?? null;
}

interface LinhaContratacao {
  id: number;
  numero_controle_pncp: string;
  orgao: string | null;
  municipio_uf: string | null;
  objeto: string | null;
  modalidade: string | null;
  valor_estimado: number | null;
  data_publicacao: string | null;
  confiabilidade: string | null;
}

function mapearLinhaParaDossie(
  row: LinhaContratacao,
  veredito: Veredito,
  itens: ItemLicitacao[],
  resultado?: Dossie["resultado"]
): Dossie {
  return {
    id: `real-${row.id}`,
    numeroControlePNCP: row.numero_controle_pncp,
    orgao: `${row.orgao ?? "Órgão não informado"} — ${row.municipio_uf ?? ""}`,
    objeto: row.objeto ?? "(objeto não informado)",
    modalidade: row.modalidade ?? "(modalidade não informada)",
    valorEstimado: row.valor_estimado ?? 0,
    dataPublicacao: row.data_publicacao ?? new Date().toISOString(),
    veredito,
    resultado,
    confiabilidade: (row.confiabilidade as Dossie["confiabilidade"]) ?? "fonte_unica",
    itens,
    achados: [],
    origem: "pncp_real",
  };
}

const COLUNAS_CONTRATACAO =
  "id, numero_controle_pncp, orgao, municipio_uf, objeto, modalidade, valor_estimado, data_publicacao, confiabilidade";

async function buscarItensDeIds(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServer>>,
  ids: number[]
): Promise<Map<number, ItemLicitacao[]>> {
  const itensPorContratacao = new Map<number, ItemLicitacao[]>();
  if (ids.length === 0) return itensPorContratacao;
  const { data: itensRows } = await supabase
    .from("itens_licitacao")
    .select("id, contratacao_id, descricao, quantidade, valor_unitario_estimado")
    .in("contratacao_id", ids);
  for (const item of itensRows ?? []) {
    const lista = itensPorContratacao.get(item.contratacao_id) ?? [];
    lista.push({
      id: item.id,
      descricao: item.descricao,
      quantidade: item.quantidade ?? 0,
      valorUnitarioEstimado: item.valor_unitario_estimado ?? 0,
    });
    itensPorContratacao.set(item.contratacao_id, lista);
  }
  return itensPorContratacao;
}

// Página real via .range() -- não carrega a base inteira pra depois
// fatiar em memória. `count: "exact"` dá o total pra paginação sem
// precisar de uma segunda query.
export async function buscarPaginaDossies(
  pagina: number,
  porPagina: number
): Promise<{ dossies: Dossie[]; totalReais: number }> {
  const supabase = await criarClienteSupabaseServer();
  const inicio = (pagina - 1) * porPagina;
  const { data, count, error } = await supabase
    .from("contratacoes")
    .select(COLUNAS_CONTRATACAO, { count: "exact" })
    .order("data_publicacao", { ascending: false })
    .range(inicio, inicio + porPagina - 1);

  if (error || !data) return { dossies: [], totalReais: 0 };

  const tenantId = await buscarTenantIdDoUsuario(supabase);
  const veredictosPorContratacao = new Map<number, Veredito>();
  if (tenantId !== null && data.length > 0) {
    const { data: analises } = await supabase
      .from("analises")
      .select("contratacao_id, veredito")
      .eq("tenant_id", tenantId)
      .in("contratacao_id", data.map((row) => row.id));
    for (const a of analises ?? []) {
      veredictosPorContratacao.set(a.contratacao_id, a.veredito as Veredito);
    }
  }

  const itensPorContratacao = await buscarItensDeIds(supabase, data.map((row) => row.id));

  const dossies = data.map((row) =>
    mapearLinhaParaDossie(
      row,
      veredictosPorContratacao.get(row.id) ?? "revisao_humana",
      itensPorContratacao.get(row.id) ?? []
    )
  );

  return { dossies, totalReais: count ?? dossies.length };
}

// Busca direta por id -- corrige bug real (Fase O): antes, /dossies/[id]
// dependia de listarTodosDossies() (capada em 1.000), então uma
// contratação real fora das 1.000 mais recentes dava 404 mesmo existindo
// no banco.
export async function buscarDossiePorId(idNumerico: number): Promise<Dossie | undefined> {
  const supabase = await criarClienteSupabaseServer();
  const { data: row, error } = await supabase
    .from("contratacoes")
    .select(COLUNAS_CONTRATACAO)
    .eq("id", idNumerico)
    .maybeSingle();

  if (error || !row) return undefined;

  const tenantId = await buscarTenantIdDoUsuario(supabase);
  let veredito: Veredito = "revisao_humana";
  let resultado: Dossie["resultado"] = "aguardando";
  if (tenantId !== null) {
    const { data: analise } = await supabase
      .from("analises")
      .select("veredito, resultado")
      .eq("tenant_id", tenantId)
      .eq("contratacao_id", idNumerico)
      .maybeSingle();
    if (analise) {
      veredito = analise.veredito as Veredito;
      resultado = (analise.resultado as Dossie["resultado"]) ?? "aguardando";
    }
  }

  const itensPorContratacao = await buscarItensDeIds(supabase, [idNumerico]);
  return mapearLinhaParaDossie(row, veredito, itensPorContratacao.get(idNumerico) ?? [], resultado);
}

export interface Metricas {
  disponivel: boolean;
  total: number;
  valorTotal: number;
  maiorValor: number;
  porVeredito: Record<Veredito, number>;
  // Fase T (RF-014) -- resultado real da disputa, só entre os "go".
  ganhouTotal: number;
  perdeuTotal: number;
  aguardandoTotal: number;
}

// RPC metricas_contratacoes (Fase O) -- soma/conta no Postgres, não num
// array de até 1.000 linhas trazido pro Node.
export async function buscarMetricas(): Promise<Metricas> {
  const vazio: Metricas = {
    disponivel: false,
    total: 0,
    valorTotal: 0,
    maiorValor: 0,
    porVeredito: { go: 0, revisao_humana: 0, no_go: 0 },
    ganhouTotal: 0,
    perdeuTotal: 0,
    aguardandoTotal: 0,
  };
  const supabase = await criarClienteSupabaseServer();
  const tenantId = await buscarTenantIdDoUsuario(supabase);
  if (tenantId === null) return vazio;

  interface LinhaMetricas {
    total: number;
    valor_total: number;
    maior_valor: number;
    go_total: number;
    revisao_total: number;
    no_go_total: number;
    ganhou_total: number;
    perdeu_total: number;
    aguardando_total: number;
  }

  const { data, error } = await supabase
    .rpc("metricas_contratacoes", { p_tenant_id: tenantId })
    .single<LinhaMetricas>();
  if (error || !data) return vazio;

  return {
    disponivel: true,
    total: Number(data.total),
    valorTotal: Number(data.valor_total),
    maiorValor: Number(data.maior_valor),
    ganhouTotal: Number(data.ganhou_total),
    perdeuTotal: Number(data.perdeu_total),
    aguardandoTotal: Number(data.aguardando_total),
    porVeredito: {
      go: Number(data.go_total),
      revisao_humana: Number(data.revisao_total),
      no_go: Number(data.no_go_total),
    },
  };
}

export interface PreviewPipeline {
  id: string;
  objeto: string;
  orgao: string;
  valorEstimado: number;
  origem: "pncp_real";
}

// RPC pipeline_preview (Fase O) -- as N mais recentes de um veredito,
// direto do Postgres. Usada só pros cards de preview de /pipeline; o
// total de cada coluna vem de buscarMetricas (mesma fonte, sem
// duplicar lógica de contagem).
export async function buscarPipelinePreview(veredito: Veredito, limite: number): Promise<PreviewPipeline[]> {
  const supabase = await criarClienteSupabaseServer();
  const tenantId = await buscarTenantIdDoUsuario(supabase);
  if (tenantId === null) return [];

  interface LinhaPreview {
    id: number;
    numero_controle_pncp: string;
    objeto: string | null;
    orgao: string | null;
    municipio_uf: string | null;
    valor_estimado: number | null;
    data_publicacao: string | null;
  }

  const resposta = await supabase.rpc("pipeline_preview", {
    p_tenant_id: tenantId,
    p_veredito: veredito,
    p_limite: limite,
  });
  const data = resposta.data as LinhaPreview[] | null;
  if (resposta.error || !data) return [];

  return data.map((row) => ({
    id: `real-${row.id}`,
    objeto: row.objeto ?? "(objeto não informado)",
    orgao: `${row.orgao ?? "Órgão não informado"} — ${row.municipio_uf ?? ""}`,
    valorEstimado: row.valor_estimado ?? 0,
    origem: "pncp_real" as const,
  }));
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

export interface ItemComparavelSemantico {
  descricao: string;
  valorUnitarioEstimado: number;
  distancia: number;
}

// Fase P -- RPC itens_comparaveis_semanticos: dado o embedding (já
// calculado, texto no formato pgvector) da descrição do item-alvo,
// retorna os itens reais mais próximos por similaridade semântica, com
// a distância de cosseno junto (o corte de "parecido o suficiente" é
// feito em precificacao.ts, não aqui).
export async function buscarItensComparaveisSemanticos(
  embeddingPgvector: string,
  excluirId?: number
): Promise<ItemComparavelSemantico[]> {
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase.rpc("itens_comparaveis_semanticos", {
    p_embedding: embeddingPgvector,
    p_limite: 50,
    p_excluir_id: excluirId ?? null,
  });
  if (error || !data) return [];
  const linhas = data as { descricao: string; valor_unitario_estimado: number; distancia: number }[];
  return linhas.map((row) => ({
    descricao: row.descricao,
    valorUnitarioEstimado: row.valor_unitario_estimado ?? 0,
    distancia: row.distancia,
  }));
}

export interface PaginaEncontrada {
  documentoId: number;
  contratacaoId: number;
  pagina: number | null;
  trecho: string;
  score: number;
}

// Fase S -- RPC buscar_paginas_documento: busca híbrida (full-text +
// vetor, mesmo RRF de buscar_contratacoes_hibrida) sobre o texto do
// edital, não só o objeto da contratação.
export async function buscarPaginasSemelhantes(texto: string, embeddingPgvector: string): Promise<PaginaEncontrada[]> {
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase.rpc("buscar_paginas_documento", {
    p_texto: texto,
    p_embedding: embeddingPgvector,
    p_limite: 10,
  });
  if (error || !data) return [];
  const linhas = data as { documento_id: number; contratacao_id: number; pagina: number | null; trecho: string; score: number }[];
  return linhas.map((row) => ({
    documentoId: row.documento_id,
    contratacaoId: row.contratacao_id,
    pagina: row.pagina,
    trecho: row.trecho,
    score: row.score,
  }));
}
