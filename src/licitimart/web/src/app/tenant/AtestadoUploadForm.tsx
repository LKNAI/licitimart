"use client";

import { useActionState } from "react";
import { enviarAtestado } from "./actions";

const estadoInicial = { erro: "" };

export default function AtestadoUploadForm({ tenantId }: { tenantId: number }) {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) =>
      (await enviarAtestado(tenantId, formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <form action={acao} className="mt-3 flex flex-wrap items-end gap-3 border-l-2 border-line-strong bg-surface p-4">
      <div className="flex-1">
        <label className="block text-[12px] text-ink-faint">Arquivo (PDF/DOCX/imagem)</label>
        <input
          name="arquivo"
          type="file"
          required
          className="mt-1 block w-full text-[13px] text-ink-soft file:mr-3 file:rounded-[4px] file:border file:border-line-strong file:bg-paper file:px-3 file:py-1.5 file:text-[12.5px] file:text-ink"
        />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="flex items-center gap-2 rounded-[4px] bg-ink px-4 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-seal-green disabled:pointer-events-none disabled:opacity-50"
      >
        {pendente && <span className="spinner" aria-hidden />}
        {pendente ? "Enviando…" : "Enviar atestado"}
      </button>
      <p role="status" aria-live="polite" className="w-full text-[13px] text-seal-red">
        {estado.erro}
      </p>
    </form>
  );
}
