"use client";

import { useActionState } from "react";
import Link from "next/link";
import { buscar, type ResultadoBusca } from "./actions";
import { campoClasse } from "@/components/ui";

const estadoInicial: { erro: string; resultados: ResultadoBusca[] } = { erro: "", resultados: [] };

export default function BuscaPage() {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await buscar(formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Prospecção Semântica</h1>
      <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-soft">
        Busca híbrida: combina correspondência de palavra-chave com similaridade de significado
        (embedding local, sem chave de LLM). Escopo desta fase: busca sobre o objeto da
        contratação — o texto completo do edital ainda não entra na busca.
      </p>

      <form action={acao} className="mt-8 flex gap-2">
        <input
          name="texto"
          required
          placeholder="ex.: equipamento médico hospitalar"
          className={`flex-1 ${campoClasse}`}
        />
        <button
          type="submit"
          disabled={pendente}
          className="shrink-0 rounded-[4px] bg-ink px-5 text-[14px] font-medium text-paper hover:bg-seal-green disabled:opacity-50"
        >
          {pendente ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {estado.erro && <p className="mt-4 text-[13px] text-seal-red">{estado.erro}</p>}

      {estado.resultados.length > 0 && (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {estado.resultados.map((r) => (
            <Link key={r.id} href={`/dossies/real-${r.id}`} className="block py-3.5 hover:bg-surface">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[14px] font-medium text-ink">{r.objeto ?? "(objeto não informado)"}</div>
                <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">{r.score.toFixed(4)}</span>
              </div>
              <div className="mt-1 text-[12.5px] text-ink-faint">
                {r.orgao} — {r.municipio_uf}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!pendente && estado.resultados.length === 0 && !estado.erro && (
        <p className="mt-8 text-[13.5px] italic text-ink-faint">Nenhuma busca feita ainda.</p>
      )}
    </div>
  );
}
