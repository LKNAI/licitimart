"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import type { Veredito } from "@/lib/mock/dossies";
import { baixarArquivo, buscarArquivos, buscarItens, respiro } from "@/lib/pncp/client";
import { extrairTexto, fatiarPorPagina } from "@/lib/pncp/extracao";
import { detectar } from "@/lib/impugnacao/detector";
import { gerarMinuta } from "@/lib/impugnacao/minuta";
import { embutirTexto, formatarParaPgvector } from "@/lib/embedding";

export async function definirVeredito(contratacaoId: number, veredito: Veredito) {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const { data: membresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membresia) return { erro: "Usuário sem tenant." };

  const { error } = await supabase
    .from("analises")
    .upsert(
      { tenant_id: membresia.tenant_id, contratacao_id: contratacaoId, veredito, criado_por: user.id },
      { onConflict: "tenant_id,contratacao_id" }
    );
  if (error) return { erro: error.message };

  revalidatePath("/dossies");
  revalidatePath("/pipeline");
  revalidatePath(`/dossies/real-${contratacaoId}`);
  return { erro: "" };
}

// Fase N: enriquecimento sob demanda (RF-002/RF-008) -- disparado pelo
// clique do usuário em /dossies/[id], não por um backfill em lote
// prévio. Busca no PNCP em tempo real (client.ts/extracao.ts, runtime
// Node) só o que ainda falta -- nunca refaz uma chamada para o que já
// está no Supabase.
export async function buscarEnriquecimento(contratacaoId: number, numeroControlePncp: string) {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const { count: totalItens } = await supabase
    .from("itens_licitacao")
    .select("id", { count: "exact", head: true })
    .eq("contratacao_id", contratacaoId);
  const { count: totalDocumentos } = await supabase
    .from("documentos_contratacao")
    .select("id", { count: "exact", head: true })
    .eq("contratacao_id", contratacaoId);

  if (!totalItens) {
    const itens = await buscarItens(numeroControlePncp);
    if (itens !== null) {
      await supabase.from("itens_licitacao").delete().eq("contratacao_id", contratacaoId);
      if (itens.length > 0) {
        const { error } = await supabase.from("itens_licitacao").insert(
          itens.map((item) => ({
            contratacao_id: contratacaoId,
            descricao: item.descricao || "(sem descrição)",
            quantidade: item.quantidade ?? null,
            valor_unitario_estimado: item.valorUnitarioEstimado ?? null,
          }))
        );
        if (error) return { erro: error.message };
      }
    }
  }

  await respiro();

  if (!totalDocumentos) {
    const arquivos = await buscarArquivos(numeroControlePncp);
    const edital = arquivos?.find((a) => (a.tipoDocumentoNome ?? "").toLowerCase().includes("edital"));
    if (edital) {
      const conteudo = await baixarArquivo(edital.url);
      if (conteudo) {
        const { texto, status, paginas, offsets } = await extrairTexto(conteudo);
        const caminho = `${numeroControlePncp}/${edital.sequencialDocumento}_${edital.titulo}`;
        const { error: erroUpload } = await supabase.storage
          .from("editais-documentos")
          .upload(caminho, Buffer.from(conteudo), { upsert: true, contentType: "application/octet-stream" });
        if (erroUpload) return { erro: erroUpload.message };

        const { data: documentoSalvo, error: erroDocumento } = await supabase
          .from("documentos_contratacao")
          .upsert(
            {
              contratacao_id: contratacaoId,
              sequencial_documento: edital.sequencialDocumento,
              titulo: edital.titulo,
              tipo_documento: edital.tipoDocumentoNome ?? null,
              storage_path: caminho,
              texto_extraido: texto || null,
              status_extracao: status,
              paginas: paginas || null,
              paginas_offsets: offsets.length ? offsets : null,
            },
            { onConflict: "contratacao_id,sequencial_documento" }
          )
          .select("id")
          .single();
        if (erroDocumento) return { erro: erroDocumento.message };

        // Fase S: indexa cada página pra busca semântica (RF-005),
        // reaproveitando o mesmo modelo de embedding da busca de
        // contratações -- não bloqueia o resto do fluxo se falhar.
        if (status === "extraido_nativo" && documentoSalvo) {
          const paginasTexto = fatiarPorPagina(texto, offsets);
          const linhas = await Promise.all(
            paginasTexto.map(async (p) => ({
              documento_id: documentoSalvo.id,
              contratacao_id: contratacaoId,
              pagina: p.pagina,
              texto: p.texto,
              embedding: formatarParaPgvector(await embutirTexto(p.texto)),
            }))
          );
          if (linhas.length > 0) {
            await supabase.from("documento_paginas").upsert(linhas, { onConflict: "documento_id,pagina" });
          }
        }
      }
    }
  }

  revalidatePath(`/dossies/real-${contratacaoId}`);
  return { erro: "" };
}

// Fase Q: Impugnação Assistida sobre documento REAL (RF-017) -- detector
// determinístico (regex, mesmo motor do spike 03, sem LLM) rodado sob
// demanda contra o texto já extraído. Achado zero é resultado válido
// (não é "ainda não avaliado") -- nunca escondido.
export async function detectarRestritividade(
  documentoId: number,
  contexto: { numeroControlePncp: string; orgao: string; objeto: string }
) {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada.", achadosCount: 0 };

  const { data: membresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membresia) return { erro: "Usuário sem tenant.", achadosCount: 0 };

  const { data: documento, error: erroDocumento } = await supabase
    .from("documentos_contratacao")
    .select("texto_extraido")
    .eq("id", documentoId)
    .single();
  if (erroDocumento || !documento?.texto_extraido) {
    return { erro: "Documento sem texto extraído.", achadosCount: 0 };
  }

  const achados = detectar(documento.texto_extraido);
  if (achados.length === 0) {
    return { erro: "", achadosCount: 0 };
  }

  const minutaMarkdown = gerarMinuta(
    { numeroControlePncp: contexto.numeroControlePncp, orgao: contexto.orgao, objeto: contexto.objeto },
    achados
  );

  const { error: erroInsert } = await supabase.from("impugnacoes").insert({
    tenant_id: membresia.tenant_id,
    contexto: {
      numero_controle_pncp: contexto.numeroControlePncp,
      orgao: contexto.orgao,
      objeto: contexto.objeto,
      documento_id: documentoId,
      achados,
    },
    minuta_markdown: minutaMarkdown,
    gerado_por: "template_deterministico_edital_real",
  });
  if (erroInsert) return { erro: erroInsert.message, achadosCount: 0 };

  revalidatePath("/impugnacoes");
  return { erro: "", achadosCount: achados.length };
}

// Fase T: resultado real da disputa (RF-014) -- só faz sentido depois
// de "Go" (decidiu disputar); sem isso, /metricas não tem como calcular
// taxa de vitória, só contagem de decisão.
export async function registrarResultadoDisputa(contratacaoId: number, resultado: "aguardando" | "ganhou" | "perdeu") {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada." };

  const { data: membresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membresia) return { erro: "Usuário sem tenant." };

  const { error } = await supabase
    .from("analises")
    .update({ resultado })
    .eq("tenant_id", membresia.tenant_id)
    .eq("contratacao_id", contratacaoId)
    .eq("veredito", "go");
  if (error) return { erro: error.message };

  revalidatePath("/metricas");
  revalidatePath(`/dossies/real-${contratacaoId}`);
  return { erro: "" };
}
