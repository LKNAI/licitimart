"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: error.message };

  // Decide o destino aqui mesmo, em vez de deixar o middleware corrigir
  // numa segunda requisição -- encadear dois redirects (action + middleware)
  // faz o Next.js renderizar a pagina certa mas deixar a URL da barra de
  // endereço errada ate um reload (achado real, testado em 09/09/2026).
  const { count } = await supabase
    .from("tenant_membros")
    .select("*", { count: "exact", head: true })
    .eq("user_id", data.user.id);
  redirect(count ? "/dossies" : "/onboarding");
}

export async function cadastrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await criarClienteSupabaseServer();
  const { error } = await supabase.auth.signUp({ email, password: senha });
  if (error) return { erro: error.message };
  redirect("/onboarding");
}

export async function sair() {
  const supabase = await criarClienteSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
