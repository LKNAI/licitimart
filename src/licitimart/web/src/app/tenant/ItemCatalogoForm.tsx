"use client";

import { useActionState } from "react";
import { adicionarItem } from "./actions";

const estadoInicial = { erro: "" };

export default function ItemCatalogoForm({ tenantId }: { tenantId: number }) {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) =>
      (await adicionarItem(tenantId, formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <form action={acao} className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <div className="flex-1">
        <label className="block text-xs font-medium text-neutral-600">Descrição</label>
        <input name="descricao" required placeholder="ex.: aparelho de ultrassom portátil" className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">CNAE (opcional)</label>
        <input name="cnae" placeholder="4645-1/02" className="mt-1 w-40 rounded-md border border-neutral-300 p-2 text-sm" />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pendente ? "Adicionando…" : "Adicionar"}
      </button>
      {estado.erro && <p className="w-full text-sm text-red-600">{estado.erro}</p>}
    </form>
  );
}
