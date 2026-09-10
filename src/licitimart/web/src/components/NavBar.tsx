"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar({ rotas }: { rotas: { href: string; rotulo: string }[] }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  // Fecha o menu mobile a cada navegação — sem isso, o link levaria pra
  // rota nova com o próprio menu ainda aberto por cima do conteúdo.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  // Ativo = a rota da lista cujo href é o prefixo mais longo do caminho
  // atual -- evita "/tenant" e "/tenant/membros" acenderem juntos (o
  // segundo sempre vence por ser mais específico).
  const ativa = rotas
    .filter((r) => pathname === r.href || pathname.startsWith(`${r.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const links = (emColuna: boolean) =>
    rotas.map((r) => {
      const ativo = r.href === ativa;
      return (
        <Link
          key={r.href}
          href={r.href}
          aria-current={ativo ? "page" : undefined}
          className={
            emColuna
              ? `rounded-[4px] px-3 py-2.5 text-[14.5px] transition-colors ${
                  ativo ? "bg-seal-green-bg font-medium text-seal-green" : "text-ink-soft hover:bg-surface"
                }`
              : `relative whitespace-nowrap py-1 text-[13.5px] transition-colors ${
                  ativo ? "text-ink" : "text-ink-soft hover:text-ink"
                }`
          }
        >
          {r.rotulo}
          {!emColuna && (
            <span
              className="absolute -bottom-[13px] left-0 right-0 h-[2px] origin-left bg-seal-green transition-transform duration-200 ease-out"
              style={{ transform: ativo ? "scaleX(1)" : "scaleX(0)" }}
            />
          )}
        </Link>
      );
    });

  return (
    <>
      {/* Mobile: um único botão de menu, não 8 abas em rolagem horizontal
          — descobrível e com alvo de toque de verdade. */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          className="flex items-center gap-2 py-1 text-[13.5px] font-medium text-ink"
        >
          <span aria-hidden className="text-[15px] leading-none">
            {aberto ? "✕" : "☰"}
          </span>
          Menu
        </button>
        {aberto && (
          <nav id="menu-mobile" className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2">
            {links(true)}
          </nav>
        )}
      </div>

      {/* Desktop/tablet: faixa horizontal com sublinhado animado. */}
      <nav className="hidden flex-nowrap gap-5 sm:flex">{links(false)}</nav>
    </>
  );
}
