import Link from "next/link";
import {
  listarTodosDossies,
  ROTULO_CONFIABILIDADE,
  ROTULO_ORIGEM,
  ROTULO_VEREDITO,
} from "@/lib/mock/dossies";
import { carregarDossiesSupabase } from "@/lib/data/dossiesSupabase";
import { SeloCompacto, type Tom } from "@/components/Selo";

const TOM_VEREDITO: Record<string, Tom> = {
  go: "green",
  no_go: "red",
  revisao_humana: "amber",
};

const TOM_CONFIABILIDADE: Record<string, Tom> = {
  confirmado: "green",
  fonte_unica: "amber",
  divergente: "red",
};

const TOM_ORIGEM: Record<string, Tom> = {
  pncp_real: "blue",
  mock_ilustrativo: "neutral",
};

const POR_PAGINA = 25;

function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
      <h1 className="font-display text-3xl font-semibold text-ink">Dossiês</h1>
      <p className="mt-2 max-w-[75ch] text-[14px] leading-relaxed text-ink-soft">
        {todos.length} dossiê(s).{" "}
        {metadado.disponivel ? (
          <>
            {ROTULO_ORIGEM.pncp_real} vêm direto da tabela <code className="font-mono text-[13px]">contratacoes</code> no
            Supabase ({metadado.total} linhas, consulta ao vivo);{" "}
          </>
        ) : (
          <>Não foi possível consultar o Supabase agora. </>
        )}
        {ROTULO_ORIGEM.mock_ilustrativo} são exemplos de como a tela fica com análise de IA (ainda
        sem chave de LLM configurada) — nenhum item real tem veredito além de Revisão Humana até
        que um humano decida.
      </p>

      <div className="mt-8 overflow-x-auto border-y border-line">
        <table className="w-full min-w-[840px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-ink-faint">
              <th className="py-2.5 pr-4 font-medium">Órgão / Objeto</th>
              <th className="py-2.5 pr-4 font-medium">Modalidade</th>
              <th className="py-2.5 pr-4 text-right font-medium">Valor estimado</th>
              <th className="py-2.5 pr-4 font-medium">Veredito</th>
              <th className="py-2.5 pr-4 font-medium">Confiabilidade</th>
              <th className="py-2.5 font-medium">Origem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visiveis.map((d) => (
              <tr key={d.id} className="align-top hover:bg-surface">
                <td className="max-w-sm py-3 pr-4">
                  <Link href={`/dossies/${d.id}`} className="font-medium text-ink hover:text-seal-green">
                    {d.objeto}
                  </Link>
                  <div className="mt-0.5 text-[12.5px] text-ink-faint">{d.orgao}</div>
                </td>
                <td className="py-3 pr-4 text-ink-soft">{d.modalidade}</td>
                <td className="py-3 pr-4 text-right font-mono text-[13px] text-ink">
                  {formatarMoeda(d.valorEstimado)}
                </td>
                <td className="py-3 pr-4">
                  <SeloCompacto tom={TOM_VEREDITO[d.veredito]}>{ROTULO_VEREDITO[d.veredito]}</SeloCompacto>
                </td>
                <td className="py-3 pr-4">
                  <SeloCompacto tom={TOM_CONFIABILIDADE[d.confiabilidade]}>
                    {ROTULO_CONFIABILIDADE[d.confiabilidade]}
                  </SeloCompacto>
                </td>
                <td className="py-3">
                  <SeloCompacto tom={TOM_ORIGEM[d.origem]}>{ROTULO_ORIGEM[d.origem]}</SeloCompacto>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[13px] text-ink-soft">
        <span className="font-mono">
          página {pagina} de {totalPaginas}
        </span>
        <div className="flex gap-2">
          {pagina > 1 && (
            <Link
              href={`/dossies?pagina=${pagina - 1}`}
              className="rounded-[4px] border border-line-strong px-3 py-1.5 hover:bg-surface"
            >
              Anterior
            </Link>
          )}
          {pagina < totalPaginas && (
            <Link
              href={`/dossies?pagina=${pagina + 1}`}
              className="rounded-[4px] border border-line-strong px-3 py-1.5 hover:bg-surface"
            >
              Próxima
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
