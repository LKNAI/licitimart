import Link from "next/link";
import {
  listarTodosDossies,
  ROTULO_CONFIABILIDADE,
  ROTULO_ORIGEM,
  ROTULO_VEREDITO,
} from "@/lib/mock/dossies";
import { carregarDossiesSupabase } from "@/lib/data/dossiesSupabase";

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

const CORES_ORIGEM: Record<string, string> = {
  pncp_real: "bg-blue-50 text-blue-700 border-blue-200",
  mock_ilustrativo: "bg-neutral-50 text-neutral-500 border-neutral-200 border-dashed",
};

const POR_PAGINA = 25;

export default async function DossiesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, Number(paginaParam ?? "1") || 1);

  const todos = await listarTodosDossies();
  const { metadado } = await carregarDossiesSupabase();
  const totalPaginas = Math.max(1, Math.ceil(todos.length / POR_PAGINA));
  const inicio = (pagina - 1) * POR_PAGINA;
  const visiveis = todos.slice(inicio, inicio + POR_PAGINA);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Dossiês</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-006 — {todos.length} dossiê(s):{" "}
        {metadado.disponivel ? (
          <>
            {ROTULO_ORIGEM.pncp_real} vêm direto da tabela <code>contratacoes</code> no Supabase
            ({metadado.total} linhas — consulta ao vivo, não mais snapshot JSON);{" "}
          </>
        ) : (
          <>Não foi possível consultar o Supabase agora (ver <code>src/lib/data/dossiesSupabase.ts</code>). </>
        )}
        {ROTULO_ORIGEM.mock_ilustrativo} são exemplos de como a tela fica quando existir análise
        de IA (ainda sem chave de LLM configurada). Nenhum item real tem veredito além de
        &quot;Revisão Humana&quot; — zero análise foi feita sobre eles ainda (RNF-012).
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
              <th className="px-4 py-3 font-medium">Origem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visiveis.map((d) => (
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
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${CORES_ORIGEM[d.origem]}`}
                  >
                    {ROTULO_ORIGEM[d.origem]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
        <span>
          Página {pagina} de {totalPaginas}
        </span>
        <div className="flex gap-2">
          {pagina > 1 && (
            <Link
              href={`/dossies?pagina=${pagina - 1}`}
              className="rounded-md border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
            >
              Anterior
            </Link>
          )}
          {pagina < totalPaginas && (
            <Link
              href={`/dossies?pagina=${pagina + 1}`}
              className="rounded-md border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
            >
              Próxima
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
