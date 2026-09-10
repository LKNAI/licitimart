"use client";

import { useTransition } from "react";
import { removerCertidao } from "./actions";

export default function RemoverCertidaoBotao({ certidaoId }: { certidaoId: number }) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciar(async () => { await removerCertidao(certidaoId); })}
      className="text-[12.5px] text-seal-red underline-offset-2 transition-colors hover:underline disabled:opacity-50"
    >
      {pendente ? "removendo…" : "remover"}
    </button>
  );
}
