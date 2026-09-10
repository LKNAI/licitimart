import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import { sair } from "@/app/login/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Licitimart",
  description: "Inteligência de licitações — Fase D, autenticação real",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Licitimart
            </Link>
            {user && (
              <nav className="flex gap-4 text-sm text-neutral-600">
                <Link href="/busca" className="hover:text-neutral-900">
                  Busca
                </Link>
                <Link href="/dossies" className="hover:text-neutral-900">
                  Dossiês
                </Link>
                <Link href="/pipeline" className="hover:text-neutral-900">
                  Pipeline
                </Link>
                <Link href="/impugnacoes" className="hover:text-neutral-900">
                  Impugnações
                </Link>
                <Link href="/retificacoes" className="hover:text-neutral-900">
                  Retificações
                </Link>
                <Link href="/metricas" className="hover:text-neutral-900">
                  Métricas
                </Link>
                <Link href="/tenant" className="hover:text-neutral-900">
                  Tenant
                </Link>
                <Link href="/tenant/membros" className="hover:text-neutral-900">
                  Membros
                </Link>
              </nav>
            )}
            <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Fase E — RBAC + recuperação de senha
            </span>
            {user && (
              <form action={sair}>
                <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                  Sair ({user.email})
                </button>
              </form>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
