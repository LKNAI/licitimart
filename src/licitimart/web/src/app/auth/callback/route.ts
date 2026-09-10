// Troca o "code" do link de e-mail (recuperação de senha) por uma sessão
// real (fluxo PKCE do @supabase/ssr). Rota pública -- o usuário ainda não
// está autenticado quando chega aqui.
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/redefinir-senha";

  if (code) {
    const supabase = await criarClienteSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
