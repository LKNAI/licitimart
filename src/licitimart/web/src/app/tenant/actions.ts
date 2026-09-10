"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export async function adicionarItem(tenantId: number, formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const cnae = String(formData.get("cnae") ?? "").trim();
  const ncm = String(formData.get("ncm") ?? "").trim();
  if (!descricao) return { erro: "Descrição é obrigatória." };

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase
    .from("tenant_catalogo_itens")
    .insert({ tenant_id: tenantId, descricao, cnae: cnae || null, ncm: ncm || null });
  if (error) return { erro: error.message };
  revalidatePath("/tenant");
  return { erro: "" };
}

export async function removerItem(itemId: number) {
  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.from("tenant_catalogo_itens").delete().eq("id", itemId);
  if (error) return { erro: error.message };
  revalidatePath("/tenant");
  return { erro: "" };
}

// Fase R -- certidões ativas (RF-004). Status (ativa/vencida) é
// calculado na hora de exibir a partir de `validade`, nunca guardado
// como booleano que pode ficar defasado sozinho.
export async function adicionarCertidao(tenantId: number, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const validade = String(formData.get("validade") ?? "").trim();
  if (!tipo) return { erro: "Tipo de certidão é obrigatório." };
  if (!validade) return { erro: "Data de validade é obrigatória." };

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase
    .from("tenant_certidoes")
    .insert({ tenant_id: tenantId, tipo, numero: numero || null, validade });
  if (error) return { erro: error.message };
  revalidatePath("/tenant");
  return { erro: "" };
}

export async function removerCertidao(certidaoId: number) {
  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.from("tenant_certidoes").delete().eq("id", certidaoId);
  if (error) return { erro: error.message };
  revalidatePath("/tenant");
  return { erro: "" };
}

// Fase R -- upload de atestado de capacidade técnica (RF-004). Bucket
// próprio do tenant (tenant-atestados), path sempre "{tenantId}/...",
// distinto de editais-documentos (dado público do PNCP, escrita só
// service_role) -- aqui o próprio tenant escreve, RLS checa o prefixo
// do path.
export async function enviarAtestado(tenantId: number, formData: FormData) {
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) return { erro: "Selecione um arquivo." };

  const supabase = await criarClienteSupabaseServer();
  const caminho = `${tenantId}/${Date.now()}_${arquivo.name}`;
  const bytes = new Uint8Array(await arquivo.arrayBuffer());

  const { error: erroUpload } = await supabase.storage
    .from("tenant-atestados")
    .upload(caminho, bytes, { contentType: arquivo.type || "application/octet-stream" });
  if (erroUpload) return { erro: erroUpload.message };

  const { error: erroInsert } = await supabase
    .from("tenant_atestados")
    .insert({ tenant_id: tenantId, titulo: arquivo.name, storage_path: caminho });
  if (erroInsert) return { erro: erroInsert.message };

  revalidatePath("/tenant");
  return { erro: "" };
}

export async function removerAtestado(atestadoId: number, storagePath: string) {
  const supabase = await criarClienteSupabaseServer();
  await supabase.storage.from("tenant-atestados").remove([storagePath]);
  const { error } = await supabase.from("tenant_atestados").delete().eq("id", atestadoId);
  if (error) return { erro: error.message };
  revalidatePath("/tenant");
  return { erro: "" };
}
