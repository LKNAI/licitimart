"use client";

import { use, useActionState } from "react";
import Link from "next/link";
import { buscarNoDocumento, type OcorrenciaBusca } from "./actions";

const estadoInicial: { erro: string; ocorrencias: OcorrenciaBusca[] } = { erro: "", ocorrencias: [] };

export default function DocumentoBuscaPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = use(params);
  const documentoId = Number(docId);

  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => {
      const termo = String(formData.get("termo") ?? "");
      return (await buscarNoDocumento(documentoId, termo)) ?? estadoInicial;
    },
    estadoInicial
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/dossies/${id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Voltar ao dossiê
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Buscar no documento</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-006 — busca sobre o texto real extraído do edital (Fase K), com a página exata de cada
        ocorrência (Fase M). Mostra a localização real no documento — não é renderização visual do
        PDF (aditivo depois), mas já é prova real, não achado inventado.
      </p>

      <form action={acao} className="mt-6 flex gap-2">
        <input
          name="termo"
          required
          placeholder="ex.: prazo de entrega"
          className="flex-1 rounded-md border border-neutral-300 p-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pendente ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {estado.erro && <p className="mt-4 text-sm text-red-600">{estado.erro}</p>}

      {estado.ocorrencias.length > 0 && (
        <div className="mt-6 space-y-3">
          {estado.ocorrencias.map((o, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-xs font-medium text-amber-700">
                {o.pagina !== null ? `Página ${o.pagina}` : "Documento sem paginação fixa (DOCX)"}
              </div>
              <p className="mt-1 font-mono text-sm leading-relaxed text-neutral-700">{o.trecho}</p>
            </div>
          ))}
        </div>
      )}

      {!pendente && estado.ocorrencias.length === 0 && !estado.erro && (
        <p className="mt-6 text-sm italic text-neutral-400">Nenhuma busca feita ainda.</p>
      )}
    </div>
  );
}
