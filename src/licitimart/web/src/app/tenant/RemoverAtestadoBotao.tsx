"use client";

import { useTransition } from "react";
import { removerAtestado } from "./actions";

export default function RemoverAtestadoBotao({ atestadoId, storagePath }: { atestadoId: number; storagePath: string }) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciar(async () => { await removerAtestado(atestadoId, storagePath); })}
      className="text-[12.5px] text-seal-red underline-offset-2 transition-colors hover:underline disabled:opacity-50"
    >
      {pendente ? "removendo…" : "remover"}
    </button>
  );
}
