"use client";

import { useActionState } from "react";
import { adicionarItem } from "./actions";
import { campoClasse } from "@/components/ui";

const estadoInicial = { erro: "" };

export default function ItemCatalogoForm({ tenantId }: { tenantId: number }) {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) =>
      (await adicionarItem(tenantId, formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <form action={acao} className="mt-6 flex flex-wrap items-end gap-3 border-l-2 border-line-strong bg-surface p-4">
      <div className="flex-1">
        <label className="block text-[12px] text-ink-faint">Descrição</label>
        <input name="descricao" required placeholder="ex.: aparelho de ultrassom portátil" className={`mt-1 ${campoClasse}`} />
      </div>
      <div>
        <label className="block text-[12px] text-ink-faint">CNAE (opcional)</label>
        <input name="cnae" placeholder="4645-1/02" className={`mt-1 w-40 ${campoClasse}`} />
      </div>
      <div>
        <label className="block text-[12px] text-ink-faint">NCM (opcional)</label>
        <input name="ncm" placeholder="9018.90.99" className={`mt-1 w-32 ${campoClasse}`} />
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
