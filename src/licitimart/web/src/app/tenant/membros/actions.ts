"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export async function convidar(tenantId: number, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const papel = String(formData.get("papel") ?? "");

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.rpc("convidar_membro", {
    p_tenant_id: tenantId,
    p_email: email,
    p_papel: papel,
  });
  if (error) return { erro: error.message };
  revalidatePath("/tenant/membros");
  return { erro: "" };
}

export async function mudarPapel(tenantId: number, userId: string, papel: string) {
  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.rpc("alterar_papel_membro", {
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_papel: papel,
  });
  if (error) return { erro: error.message };
  revalidatePath("/tenant/membros");
  return { erro: "" };
}

export async function remover(tenantId: number, userId: string) {
  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.rpc("remover_membro", {
    p_tenant_id: tenantId,
    p_user_id: userId,
  });
  if (error) return { erro: error.message };
  revalidatePath("/tenant/membros");
  return { erro: "" };
}
