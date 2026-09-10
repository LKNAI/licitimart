"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export async function redefinirSenha(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  if (senha.length < 6) return { erro: "Senha precisa de ao menos 6 caracteres." };

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: error.message };
  redirect("/dossies");
}
