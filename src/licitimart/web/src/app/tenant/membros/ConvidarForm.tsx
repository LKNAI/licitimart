"use client";

import { useActionState } from "react";
import { convidar } from "./actions";

const estadoInicial = { erro: "" };

export default function ConvidarForm({ tenantId }: { tenantId: number }) {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) =>
      (await convidar(tenantId, formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <form action={acao} className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-600">E-mail (conta já existente)</label>
        <input name="email" type="email" required placeholder="pessoa@empresa.com" className="mt-1 w-56 rounded-md border border-neutral-300 p-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Papel</label>
        <select name="papel" defaultValue="analista" className="mt-1 rounded-md border border-neutral-300 p-2 text-sm">
          <option value="analista">analista</option>
          <option value="gestor_comercial">gestor_comercial</option>
          <option value="juridico_compliance">juridico_compliance</option>
          <option value="admin_tenant">admin_tenant</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pendente ? "Convidando…" : "Convidar"}
      </button>
      {estado.erro && <p className="w-full text-sm text-red-600">{estado.erro}</p>}
    </form>
  );
}
