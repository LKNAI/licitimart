"use client";

import { useActionState } from "react";
import Link from "next/link";
import { buscar, type ResultadoBusca, type ResultadoPagina } from "./actions";
import { campoClasse } from "@/components/ui";

const estadoInicial: { erro: string; resultados: ResultadoBusca[]; paginas: ResultadoPagina[] } = {
  erro: "",
  resultados: [],
  paginas: [],
};

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
        (embedding local, sem chave de LLM) — sobre o objeto da contratação e sobre o texto do
        edital já extraído (quando disponível).
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
          className="flex shrink-0 items-center gap-2 rounded-[4px] bg-ink px-5 text-[14px] font-medium text-paper transition-colors hover:bg-seal-green disabled:pointer-events-none disabled:opacity-50"
        >
          {pendente && <span className="spinner" aria-hidden />}
          {pendente ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <p role="status" aria-live="polite" className="mt-4 text-[13px] text-seal-red">
        {estado.erro}
      </p>

      {estado.resultados.length > 0 && (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {estado.resultados.map((r) => (
            <Link key={r.id} href={`/dossies/real-${r.id}`} className="block py-3.5 transition-colors hover:bg-surface">
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

      {estado.paginas.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-ink">Trechos de editais</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Busca dentro do texto real extraído do documento — só cobre contratações já enriquecidas.
          </p>
          <div className="mt-3 divide-y divide-line border-y border-line">
            {estado.paginas.map((p, i) => (
              <Link
                key={i}
                href={`/dossies/real-${p.contratacaoId}/documento/${p.documentoId}`}
                className="block py-3.5 transition-colors hover:bg-surface"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[13.5px] font-medium text-ink">{p.objeto ?? "(objeto não informado)"}</div>
                  <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
                    {p.pagina !== null ? `página ${p.pagina}` : "sem paginação"}
                  </span>
                </div>
                <div className="mt-1 text-[12.5px] text-ink-faint">{p.orgao}</div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{p.trecho}…</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!pendente && estado.resultados.length === 0 && estado.paginas.length === 0 && !estado.erro && (
        <p className="mt-8 text-[13.5px] italic text-ink-faint">Nenhuma busca feita ainda.</p>
      )}
    </div>
  );
}
