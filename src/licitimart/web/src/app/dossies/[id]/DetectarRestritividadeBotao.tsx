"use client";

import { useState, useTransition } from "react";
import { detectarRestritividade } from "./actions";

export default function DetectarRestritividadeBotao({
  documentoId,
  numeroControlePNCP,
  orgao,
  objeto,
}: {
  documentoId: number;
  numeroControlePNCP: string;
  orgao: string;
  objeto: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ achadosCount: number } | null>(null);
  const [erro, setErro] = useState("");

  return (
    <div className="mt-2 flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro("");
            setResultado(null);
            const r = await detectarRestritividade(documentoId, { numeroControlePncp: numeroControlePNCP, orgao, objeto });
            if (r.erro) setErro(r.erro);
            else setResultado({ achadosCount: r.achadosCount });
          })
        }
        className="rounded-[4px] border border-line-strong px-2.5 py-1 text-[12.5px] text-ink-soft transition-colors hover:bg-surface disabled:opacity-60"
      >
        {pendente ? "Analisando…" : "Detectar restritividade no texto real"}
      </button>
      {erro && <p className="text-[12px] text-seal-red">{erro}</p>}
      {resultado && resultado.achadosCount === 0 && (
        <p className="text-[12px] italic text-ink-faint">
          Nenhum dos 8 padrões conhecidos foi detectado neste documento.
        </p>
      )}
      {resultado && resultado.achadosCount > 0 && (
        <p className="text-[12px] text-seal-red">
          {resultado.achadosCount} candidato(s) a cláusula restritiva — ver rascunho em{" "}
          <a href="/impugnacoes" className="underline">
            Impugnações
          </a>
          .
        </p>
      )}
    </div>
  );
}
