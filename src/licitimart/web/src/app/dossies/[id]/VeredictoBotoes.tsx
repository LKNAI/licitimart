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
  go: "bg-emerald-600 text-white border-emerald-600",
  revisao_humana: "bg-amber-500 text-white border-amber-500",
  no_go: "bg-red-600 text-white border-red-600",
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
    <div className="flex flex-wrap gap-2">
      {OPCOES.map((v) => {
        const ativo = v === vereditoAtual;
        return (
          <button
            key={v}
            type="button"
            disabled={pendente || ativo}
            onClick={() => iniciar(async () => { await definirVeredito(contratacaoId, v); })}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-100 ${
              ativo ? ESTILO_ATIVO[v] : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {ROTULO_VEREDITO[v]}
          </button>
        );
      })}
    </div>
  );
}
