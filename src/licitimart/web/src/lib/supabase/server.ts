// Cliente Supabase para uso no servidor (Server Components, Route Handlers).
// Mesma regra do client.ts: sem env var real, falha explicitamente --
// nunca finge sucesso com dado mock disfarçado de conexão real.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function exigirEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(
      `Variável de ambiente ${nome} não configurada. Copie .env.example para .env.local e preencha com o projeto Supabase real (ainda não existe um configurado neste ambiente).`
    );
  }
  return valor;
}

export async function criarClienteSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    exigirEnv("NEXT_PUBLIC_SUPABASE_URL"),
    exigirEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component sem permissão de escrita de
            // cookie -- inofensivo se houver middleware de refresh de
            // sessão (ainda não existe aqui; ver plan.md, "falta").
          }
        },
      },
    }
  );
}
