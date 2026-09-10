import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarDossie, ROTULO_CONFIABILIDADE, ROTULO_ORIGEM, ROTULO_VEREDITO } from "@/lib/mock/dossies";
import VeredictoBotoes from "./VeredictoBotoes";

export default async function DossieDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dossie = await buscarDossie(id);
  if (!dossie) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/dossies" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Dossiês
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{dossie.objeto}</h1>
      <p className="text-neutral-600">{dossie.orgao}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-700">
          {dossie.modalidade}
        </span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-700">
          {dossie.numeroControlePNCP}
        </span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-700">
          Publicado em {new Date(dossie.dataPublicacao).toLocaleDateString("pt-BR")}
        </span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-700">
          {ROTULO_ORIGEM[dossie.origem]}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">Veredito</div>
          {dossie.origem === "pncp_real" ? (
            <div className="mt-2">
              <VeredictoBotoes
                contratacaoId={Number(dossie.id.replace("real-", ""))}
                vereditoAtual={dossie.veredito}
              />
            </div>
          ) : (
            <div className="mt-1 text-lg font-semibold">{ROTULO_VEREDITO[dossie.veredito]}</div>
          )}
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">Selo de Confiabilidade</div>
          <div className="mt-1 text-lg font-semibold">{ROTULO_CONFIABILIDADE[dossie.confiabilidade]}</div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Itens</h2>
      {dossie.itens.length === 0 && (
        <p className="mt-2 text-sm italic text-neutral-500">
          Relação de itens ainda não extraída do documento (só o metadado de publicação foi
          coletado até aqui — ver `src/licitimart/itens/`, ainda não construído).
        </p>
      )}
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-neutral-500">
          <tr>
            <th className="py-2 font-medium">Descrição</th>
            <th className="py-2 font-medium">Qtd.</th>
            <th className="py-2 font-medium">Valor unitário estimado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {dossie.itens.map((item, i) => (
            <tr key={i}>
              <td className="py-2">{item.descricao}</td>
              <td className="py-2">{item.quantidade}</td>
              <td className="py-2">
                {item.valorUnitarioEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-8 text-lg font-semibold">Achados</h2>
      <p className="text-xs text-neutral-500">
        RNF-010 — toda citação levaria, em produção, ao trecho realçado na página exata do
        documento de origem. Aqui é só o link mock.
      </p>
      <div className="mt-3 space-y-3">
        {dossie.achados.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm italic text-neutral-500">
            Nenhuma análise feita ainda sobre este dossiê — os agentes AG-01 a AG-05 dependem de
            uma chave de LLM não configurada neste ambiente. Isso é diferente de &quot;sem
            achado&quot;: é &quot;ainda não avaliado&quot; (RNF-012).
          </div>
        )}
        {dossie.achados.map((achado, i) =>
          achado.confianca === "dado_insuficiente" ? (
            <div key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-sm font-medium text-neutral-500">{achado.criterio}</div>
              <div className="mt-1 text-sm italic text-neutral-400">
                Dado insuficiente — não localizado nos documentos disponíveis. Nunca inferido
                como &quot;requisito não cumprido&quot; (RF-020, RNF-012).
              </div>
            </div>
          ) : (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-sm font-medium text-neutral-900">{achado.criterio}</div>
              <p className="mt-1 text-sm text-neutral-600">{achado.achado}</p>
              <button className="mt-2 rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100">
                Abrir na página {achado.pagina} (mock) — &quot;{achado.citacao}&quot;
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
