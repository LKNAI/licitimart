"use client";

import { useState } from "react";

export default function TenantPage() {
  const [catalogo, setCatalogo] = useState("");
  const [cnaes, setCnaes] = useState("");
  const [salvo, setSalvo] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Perfil do Tenant</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-004 — cadastro de catálogo, CNAEs/NCMs, atestados e certidões ativas.
      </p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Este formulário <strong>não persiste nada</strong> — não há projeto Supabase configurado
        neste ambiente. É só a estrutura de tela (RNF-005 isolamento multi-tenant depende do
        banco real existir).
      </div>

      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSalvo(true);
        }}
      >
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Catálogo de produtos/serviços
          </label>
          <textarea
            value={catalogo}
            onChange={(e) => setCatalogo(e.target.value)}
            rows={4}
            placeholder="Um item por linha — ex.: aparelho de ultrassom portátil"
            className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">CNAEs de interesse</label>
          <input
            value={cnaes}
            onChange={(e) => setCnaes(e.target.value)}
            placeholder="Separados por vírgula — ex.: 4645-1/02, 3250-7/01"
            className="mt-1 w-full rounded-md border border-neutral-300 p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Atestados de capacidade técnica (upload)
          </label>
          <input
            type="file"
            disabled
            className="mt-1 block text-sm text-neutral-400"
            title="Upload exige Supabase Storage real, não configurado ainda"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Salvar (não persiste)
        </button>

        {salvo && (
          <p className="text-sm text-emerald-700">
            Formulário &quot;enviado&quot; — nada foi salvo em lugar nenhum. Isto é intencional.
          </p>
        )}
      </form>
    </div>
  );
}
