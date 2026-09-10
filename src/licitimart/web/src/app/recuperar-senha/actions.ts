"use server";

import { headers } from "next/headers";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export async function pedirRecuperacao(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const origin = (await headers()).get("origin") ?? "";

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
  });
  // Nunca revelar se o e-mail existe ou não -- mesma mensagem nos dois
  // casos, para não virar oráculo de enumeração de contas.
  if (error) return { erro: "Não foi possível processar o pedido agora. Tente de novo em instantes." };
  return { enviado: true };
}
