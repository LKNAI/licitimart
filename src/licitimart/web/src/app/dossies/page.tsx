import Link from "next/link";
import {
  DOSSIES_MOCK,
  ROTULO_CONFIABILIDADE,
  ROTULO_VEREDITO,
} from "@/lib/mock/dossies";

const CORES_VEREDITO: Record<string, string> = {
  go: "bg-emerald-100 text-emerald-800",
  no_go: "bg-red-100 text-red-800",
  revisao_humana: "bg-amber-100 text-amber-800",
};

const CORES_CONFIABILIDADE: Record<string, string> = {
  confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  fonte_unica: "bg-neutral-50 text-neutral-600 border-neutral-200",
  divergente: "bg-red-50 text-red-700 border-red-200",
};

export default function DossiesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Dossiês</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-006 — dado mock. Cada linha teria, em produção, procedência real (RF-019) e
        citação rastreável até a página do documento.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Órgão / Objeto</th>
              <th className="px-4 py-3 font-medium">Modalidade</th>
              <th className="px-4 py-3 font-medium">Valor estimado</th>
              <th className="px-4 py-3 font-medium">Veredito</th>
              <th className="px-4 py-3 font-medium">Confiabilidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {DOSSIES_MOCK.map((d) => (
              <tr key={d.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/dossies/${d.id}`} className="font-medium text-neutral-900 hover:underline">
                    {d.objeto}
                  </Link>
                  <div className="text-xs text-neutral-500">{d.orgao}</div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{d.modalidade}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {d.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CORES_VEREDITO[d.veredito]}`}>
                    {ROTULO_VEREDITO[d.veredito]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${CORES_CONFIABILIDADE[d.confiabilidade]}`}
                  >
                    {ROTULO_CONFIABILIDADE[d.confiabilidade]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
