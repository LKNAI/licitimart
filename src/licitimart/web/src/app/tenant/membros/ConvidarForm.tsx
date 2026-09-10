"use client";

import { useActionState } from "react";
import { convidar } from "./actions";
import { campoClasse } from "@/components/ui";

const estadoInicial = { erro: "" };

export default function ConvidarForm({ tenantId }: { tenantId: number }) {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) =>
      (await convidar(tenantId, formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <form action={acao} className="mt-6 flex flex-wrap items-end gap-3 border-l-2 border-line-strong bg-surface p-4">
      <div>
        <label className="block text-[12px] text-ink-faint">E-mail (conta já existente)</label>
        <input name="email" type="email" required placeholder="pessoa@empresa.com" className={`mt-1 w-56 ${campoClasse}`} />
      </div>
      <div>
        <label className="block text-[12px] text-ink-faint">Papel</label>
        <select name="papel" defaultValue="analista" className={`mt-1 ${campoClasse}`}>
          <option value="analista">analista</option>
          <option value="gestor_comercial">gestor_comercial</option>
          <option value="juridico_compliance">juridico_compliance</option>
          <option value="admin_tenant">admin_tenant</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="flex items-center gap-2 rounded-[4px] bg-ink px-4 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-seal-green disabled:pointer-events-none disabled:opacity-50"
      >
        {pendente && <span className="spinner" aria-hidden />}
        {pendente ? "Convidando…" : "Convidar"}
      </button>
      <p role="status" aria-live="polite" className="w-full text-[13px] text-seal-red">
        {estado.erro}
      </p>
    </form>
  );
}
