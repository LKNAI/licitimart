"use client";

import { useTransition } from "react";
import { registrarResultadoDisputa } from "./actions";

const ROTULO: Record<string, string> = {
  aguardando: "Aguardando",
  ganhou: "Ganhou",
  perdeu: "Perdeu",
};

const ESTILO_ATIVO: Record<string, string> = {
  aguardando: "bg-seal-amber text-paper border-seal-amber",
  ganhou: "bg-seal-green text-paper border-seal-green",
  perdeu: "bg-seal-red text-paper border-seal-red",
};

export default function ResultadoDisputaSelect({
  contratacaoId,
  resultadoAtual,
}: {
  contratacaoId: number;
  resultadoAtual: "aguardando" | "ganhou" | "perdeu";
}) {
  const [pendente, iniciar] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {(["aguardando", "ganhou", "perdeu"] as const).map((r) => {
        const ativo = r === resultadoAtual;
        return (
          <button
            key={r}
            type="button"
            disabled={pendente || ativo}
            onClick={() => iniciar(async () => { await registrarResultadoDisputa(contratacaoId, r); })}
            className={`rounded-[4px] border px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-100 ${
              ativo ? ESTILO_ATIVO[r] : "border-line-strong text-ink-soft hover:bg-surface"
            }`}
          >
            {ROTULO[r]}
          </button>
        );
      })}
    </div>
  );
}
