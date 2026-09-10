"use client";

import { useActionState } from "react";
import { adicionarCertidao } from "./actions";
import { campoClasse } from "@/components/ui";

const estadoInicial = { erro: "" };

export default function CertidaoForm({ tenantId }: { tenantId: number }) {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) =>
      (await adicionarCertidao(tenantId, formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <form action={acao} className="mt-6 flex flex-wrap items-end gap-3 border-l-2 border-line-strong bg-surface p-4">
      <div className="flex-1">
        <label className="block text-[12px] text-ink-faint">Tipo de certidão</label>
        <input name="tipo" required placeholder="ex.: Regularidade Fiscal Federal" className={`mt-1 ${campoClasse}`} />
      </div>
      <div>
        <label className="block text-[12px] text-ink-faint">Número (opcional)</label>
        <input name="numero" placeholder="123456789" className={`mt-1 w-36 ${campoClasse}`} />
      </div>
      <div>
        <label className="block text-[12px] text-ink-faint">Validade</label>
        <input name="validade" type="date" required className={`mt-1 ${campoClasse}`} />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="flex items-center gap-2 rounded-[4px] bg-ink px-4 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-seal-green disabled:pointer-events-none disabled:opacity-50"
      >
        {pendente && <span className="spinner" aria-hidden />}
        {pendente ? "Adicionando…" : "Adicionar"}
      </button>
      <p role="status" aria-live="polite" className="w-full text-[13px] text-seal-red">
        {estado.erro}
      </p>
    </form>
  );
}
