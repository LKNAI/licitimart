"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export async function adicionarItem(tenantId: number, formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const cnae = String(formData.get("cnae") ?? "").trim();
  if (!descricao) return { erro: "Descrição é obrigatória." };

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase
    .from("tenant_catalogo_itens")
    .insert({ tenant_id: tenantId, descricao, cnae: cnae || null });
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
