"use client";

import { useActionState } from "react";
import Link from "next/link";
import { buscar, type ResultadoBusca } from "./actions";

const estadoInicial: { erro: string; resultados: ResultadoBusca[] } = { erro: "", resultados: [] };

export default function BuscaPage() {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await buscar(formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Prospecção Semântica</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-005 — busca híbrida: combina correspondência de palavra-chave (full-text do Postgres) com
        similaridade de significado (embedding local, sem chave de LLM) via Reciprocal Rank Fusion.
        Escopo desta fase: busca sobre o objeto da contratação — texto completo do edital depende de
        RF-002 (extração de PDF), ainda não construído.
      </p>

      <form action={acao} className="mt-6 flex gap-2">
        <input
          name="texto"
          required
          placeholder="ex.: equipamento médico hospitalar"
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

      {estado.resultados.length > 0 && (
        <div className="mt-6 space-y-3">
          {estado.resultados.map((r) => (
            <Link
              key={r.id}
              href={`/dossies/real-${r.id}`}
              className="block rounded-lg border border-neutral-200 bg-white p-4 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-neutral-900">{r.objeto ?? "(objeto não informado)"}</div>
                <span className="shrink-0 text-xs text-neutral-400">score {r.score.toFixed(4)}</span>
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {r.orgao} — {r.municipio_uf}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!pendente && estado.resultados.length === 0 && !estado.erro && (
        <p className="mt-6 text-sm italic text-neutral-400">Nenhuma busca feita ainda.</p>
      )}
    </div>
  );
}
