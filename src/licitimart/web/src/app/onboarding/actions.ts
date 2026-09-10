"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export async function criarEmpresa(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Nome da empresa é obrigatório." };

  const supabase = await criarClienteSupabaseServer();
  // RPC security definer -- nunca aceita tenant_id como parametro, sempre
  // cria tenant novo e associa o usuario autenticado como admin_tenant
  // (ver supabase/migrations/20260909233740_fase_d_auth.sql).
  const { error } = await supabase.rpc("criar_tenant_e_associar", { p_nome: nome });
  if (error) return { erro: error.message };
  redirect("/dossies");
}
