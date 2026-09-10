// Refresh de sessao em toda requisicao (padrao oficial @supabase/ssr) --
// sem isso, o cookie de sessao expira e o usuario cai deslogado no meio
// do uso, mesmo com token de refresh valido.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_PUBLICAS = ["/login", "/auth"];
const ROTA_ONBOARDING = "/onboarding";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const rotaPublica = ROTAS_PUBLICAS.some((r) => path.startsWith(r));

  if (!user && !rotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logado mas sem tenant ainda -- manda para onboarding, exceto se ja
  // esta indo para /onboarding ou para uma rota publica (login/callback).
  if (user && !rotaPublica && path !== ROTA_ONBOARDING) {
    const { count } = await supabase
      .from("tenant_membros")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (!count) {
      const url = request.nextUrl.clone();
      url.pathname = ROTA_ONBOARDING;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
