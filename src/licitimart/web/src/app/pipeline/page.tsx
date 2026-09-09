import Link from "next/link";
import { DOSSIES_MOCK, ROTULO_VEREDITO, Veredito } from "@/lib/mock/dossies";

// Ordem deliberada: Go, Revisão Humana, No-Go -- Revisão Humana no meio,
// coluna de primeira classe, nao um "extra" ao lado (ERS secao 4.1, regra 2).
const COLUNAS: Veredito[] = ["go", "revisao_humana", "no_go"];

const ESTILO_COLUNA: Record<Veredito, string> = {
  go: "border-emerald-200 bg-emerald-50",
  revisao_humana: "border-amber-200 bg-amber-50",
  no_go: "border-red-200 bg-red-50",
};

export default function PipelinePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Pipeline Go / No-Go</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-007 — dado mock. &quot;Revisão Humana&quot; é resultado esperado e frequente,
        não uma saída residual — por isso fica no meio, do mesmo tamanho das outras duas.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {COLUNAS.map((veredito) => (
          <div key={veredito} className={`rounded-lg border p-3 ${ESTILO_COLUNA[veredito]}`}>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              {ROTULO_VEREDITO[veredito]}
              <span className="ml-2 text-neutral-400">
                ({DOSSIES_MOCK.filter((d) => d.veredito === veredito).length})
              </span>
            </h2>
            <div className="space-y-2">
              {DOSSIES_MOCK.filter((d) => d.veredito === veredito).map((d) => (
                <Link
                  key={d.id}
                  href={`/dossies/${d.id}`}
                  className="block rounded-md border border-neutral-200 bg-white p-3 text-sm hover:shadow-sm"
                >
                  <div className="font-medium text-neutral-900">{d.objeto}</div>
                  <div className="mt-1 text-xs text-neutral-500">{d.orgao}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {d.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
