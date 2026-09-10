import Link from "next/link";
import { listarTodosDossies, ROTULO_ORIGEM, ROTULO_VEREDITO, Veredito } from "@/lib/mock/dossies";

// Ordem deliberada: Go, Revisão Humana, No-Go -- Revisão Humana no meio,
// coluna de primeira classe, nao um "extra" ao lado (ERS secao 4.1, regra 2).
const COLUNAS: Veredito[] = ["go", "revisao_humana", "no_go"];
const CARDS_POR_COLUNA = 6;

const ESTILO_COLUNA: Record<Veredito, string> = {
  go: "border-emerald-200 bg-emerald-50",
  revisao_humana: "border-amber-200 bg-amber-50",
  no_go: "border-red-200 bg-red-50",
};

export default async function PipelinePage() {
  const todos = await listarTodosDossies();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Pipeline Go / No-Go</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-007 — &quot;Revisão Humana&quot; é resultado esperado e frequente, não uma saída
        residual — por isso fica no meio, do mesmo tamanho das outras duas. Hoje o veredito de
        dossiês reais só muda por decisão humana (abra o dossiê e marque Go/No-Go/Revisão
        Humana) — os agentes AG-01 a AG-05 que classificariam automaticamente dependem de uma
        chave de LLM não configurada neste ambiente.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {COLUNAS.map((veredito) => {
          const itensColuna = todos.filter((d) => d.veredito === veredito);
          const visiveis = itensColuna.slice(0, CARDS_POR_COLUNA);
          const restantes = itensColuna.length - visiveis.length;

          return (
            <div key={veredito} className={`rounded-lg border p-3 ${ESTILO_COLUNA[veredito]}`}>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                {ROTULO_VEREDITO[veredito]}
                <span className="ml-2 text-neutral-400">({itensColuna.length})</span>
              </h2>
              <div className="space-y-2">
                {visiveis.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dossies/${d.id}`}
                    className="block rounded-md border border-neutral-200 bg-white p-3 text-sm hover:shadow-sm"
                  >
                    <div className="font-medium text-neutral-900">{d.objeto}</div>
                    <div className="mt-1 text-xs text-neutral-500">{d.orgao}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-neutral-500">
                        {d.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className="text-[10px] text-neutral-400">{ROTULO_ORIGEM[d.origem]}</span>
                    </div>
                  </Link>
                ))}
                {restantes > 0 && (
                  <Link
                    href="/dossies"
                    className="block rounded-md border border-dashed border-neutral-300 p-3 text-center text-xs text-neutral-500 hover:bg-white"
                  >
                    + {restantes} outro(s) — ver em Dossiês
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
