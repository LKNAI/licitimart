import type { Metadata } from "next";
import { Source_Serif_4, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import { sair } from "@/app/login/actions";
import NavBar from "@/components/NavBar";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Licitimart",
  description: "Inteligência de licitações públicas — triagem e verificação de editais reais do PNCP",
};

const ROTAS: { href: string; rotulo: string }[] = [
  { href: "/busca", rotulo: "Busca" },
  { href: "/dossies", rotulo: "Dossiês" },
  { href: "/pipeline", rotulo: "Pipeline" },
  { href: "/impugnacoes", rotulo: "Impugnações" },
  { href: "/retificacoes", rotulo: "Retificações" },
  { href: "/metricas", rotulo: "Métricas" },
  { href: "/tenant", rotulo: "Tenant" },
  { href: "/tenant/membros", rotulo: "Membros" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="pt-BR"
      className={`${sourceSerif.variable} ${publicSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-paper font-sans text-[15px] text-ink antialiased">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-3.5">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="font-display text-[19px] font-semibold tracking-tight text-ink">
                Licitimart
              </Link>
              {user && (
                <form action={sair} className="flex items-center gap-3">
                  <span className="hidden font-mono text-xs text-ink-faint sm:inline">{user.email}</span>
                  <button type="submit" className="text-[13px] text-ink-soft hover:text-ink">
                    Sair
                  </button>
                </form>
              )}
            </div>
            {user && (
              <div className="-mx-6 mt-2 overflow-x-auto px-6">
                <NavBar rotas={ROTAS} />
              </div>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
