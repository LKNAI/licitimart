"use client";

import { useState, useTransition } from "react";
import { mudarPapel, remover } from "./actions";

const PAPEIS = ["analista", "gestor_comercial", "juridico_compliance", "admin_tenant"] as const;

export default function PapelSelect({
  tenantId,
  userId,
  papelAtual,
  ehVoceMesmo,
}: {
  tenantId: number;
  userId: string;
  papelAtual: string;
  ehVoceMesmo: boolean;
}) {
  const [papel, setPapel] = useState(papelAtual);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        value={papel}
        disabled={pendente}
        onChange={(e) => {
          const novoPapel = e.target.value;
          setPapel(novoPapel);
          iniciar(async () => {
            const resultado = await mudarPapel(tenantId, userId, novoPapel);
            if (resultado?.erro) {
              setErro(resultado.erro);
              setPapel(papelAtual);
            } else {
              setErro("");
            }
          });
        }}
        className="rounded-[4px] border border-line-strong bg-surface-raised p-1.5 text-[13px] text-ink transition-colors disabled:opacity-60"
      >
        {PAPEIS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {pendente && <span className="spinner text-ink-faint" aria-hidden />}
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (!confirm(ehVoceMesmo ? "Remover você mesmo do tenant?" : "Remover este membro do tenant?")) return;
          iniciar(async () => {
            const resultado = await remover(tenantId, userId);
            if (resultado?.erro) setErro(resultado.erro);
          });
        }}
        className="text-[12.5px] text-seal-red underline-offset-2 transition-colors hover:underline disabled:opacity-50"
      >
        remover
      </button>
      <span role="status" aria-live="polite" className="text-[12.5px] text-seal-red">
        {erro}
      </span>
    </div>
  );
}
