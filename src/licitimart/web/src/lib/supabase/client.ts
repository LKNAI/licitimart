// Cliente Supabase para uso no browser (Client Components).
// Exige as duas env vars -- nunca cai num cliente "mock" silencioso se
// faltar configuracao, porque isso escondia erro de ambiente real.
import { createBrowserClient } from "@supabase/ssr";

function exigirEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(
      `Variável de ambiente ${nome} não configurada. Copie .env.example para .env.local e preencha com o projeto Supabase real (ainda não existe um configurado neste ambiente).`
    );
  }
  return valor;
}

export function criarClienteSupabaseBrowser() {
  return createBrowserClient(
    exigirEnv("NEXT_PUBLIC_SUPABASE_URL"),
    exigirEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
