"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar({ rotas }: { rotas: { href: string; rotulo: string }[] }) {
  const pathname = usePathname();

  // Ativo = a rota da lista cujo href é o prefixo mais longo do caminho
  // atual -- evita "/tenant" e "/tenant/membros" acenderem juntos (o
  // segundo sempre vence por ser mais específico).
  const ativa = rotas
    .filter((r) => pathname === r.href || pathname.startsWith(`${r.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex flex-nowrap gap-5">
      {rotas.map((r) => {
        const ativo = r.href === ativa;
        return (
          <Link
            key={r.href}
            href={r.href}
            className={`relative whitespace-nowrap py-1 text-[13.5px] transition-colors ${
              ativo ? "text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {r.rotulo}
            {ativo && <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-seal-green" />}
          </Link>
        );
      })}
    </nav>
  );
}
