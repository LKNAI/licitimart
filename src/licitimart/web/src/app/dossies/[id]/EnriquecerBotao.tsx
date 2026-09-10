"use client";

import { useState, useTransition } from "react";
import { buscarEnriquecimento } from "./actions";

export default function EnriquecerBotao({
  contratacaoId,
  numeroControlePNCP,
}: {
  contratacaoId: number;
  numeroControlePNCP: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  return (
    <div className="rounded-[6px] border border-dashed border-line-strong bg-surface p-4">
      <p className="text-[13.5px] text-ink-soft">
        Itens e documento ainda não coletados para esta contratação.
      </p>
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro("");
            const resultado = await buscarEnriquecimento(contratacaoId, numeroControlePNCP);
            if (resultado.erro) setErro(resultado.erro);
          })
        }
        className="mt-2.5 flex items-center gap-2 rounded-[4px] border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
      >
        {pendente && <span className="spinner" aria-hidden />}
        {pendente ? "Buscando no PNCP…" : "Buscar itens e documento agora"}
      </button>
      <p role="status" aria-live="polite" className="mt-2 text-[12.5px] text-seal-red">
        {erro}
      </p>
    </div>
  );
}
