"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import type { Veredito } from "@/lib/mock/dossies";

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
