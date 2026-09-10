"use client";

import { useTransition } from "react";
import { definirVeredito } from "./actions";
import type { Veredito } from "@/lib/mock/dossies";

// Rotulo local, deliberadamente nao importado de @/lib/mock/dossies --
// esse modulo reexporta dossiesSupabase.ts (server-only, usa
// next/headers) e um import de valor (nao so tipo) arrastaria isso para
// o bundle do cliente.
const ROTULO_VEREDITO: Record<Veredito, string> = {
  go: "Go",
  no_go: "No-Go",
  revisao_humana: "Revisão Humana",
};

const OPCOES: Veredito[] = ["go", "revisao_humana", "no_go"];

const ESTILO_ATIVO: Record<Veredito, string> = {
  go: "bg-seal-green text-paper border-seal-green",
  revisao_humana: "bg-seal-amber text-paper border-seal-amber",
  no_go: "bg-seal-red text-paper border-seal-red",
};

export default function VeredictoBotoes({
  contratacaoId,
  vereditoAtual,
}: {
  contratacaoId: number;
  vereditoAtual: Veredito;
}) {
  const [pendente, iniciar] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPCOES.map((v) => {
        const ativo = v === vereditoAtual;
        return (
          <button
            key={v}
            type="button"
            disabled={pendente || ativo}
            aria-pressed={ativo}
            onClick={() => iniciar(async () => { await definirVeredito(contratacaoId, v); })}
            className={`rounded-[4px] border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-100 ${
              ativo ? ESTILO_ATIVO[v] : "border-line-strong text-ink-soft hover:bg-surface disabled:opacity-50"
            }`}
          >
            {ROTULO_VEREDITO[v]}
          </button>
        );
      })}
      {pendente && (
        <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-[12px] text-ink-faint">
          <span className="spinner" aria-hidden />
          salvando…
        </span>
      )}
    </div>
  );
}
