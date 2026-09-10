import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarDossie, ROTULO_CONFIABILIDADE, ROTULO_ORIGEM, ROTULO_VEREDITO } from "@/lib/mock/dossies";
import { buscarItensComparaveis, buscarDocumentosContratacao } from "@/lib/data/dossiesSupabase";
import { calcularFaixaPreco } from "@/lib/precificacao";
import VeredictoBotoes from "./VeredictoBotoes";

export default async function DossieDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dossie = await buscarDossie(id);
  if (!dossie) notFound();

  const itensComparaveis = await buscarItensComparaveis(dossie.itens.map((i) => i.descricao));
  const documentos = dossie.origem === "pncp_real"
    ? await buscarDocumentosContratacao(Number(dossie.id.replace("real-", "")))
    : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/dossies" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Dossiês
        </Link>
        <a
          href={`/dossies/${dossie.id}/exportar`}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Exportar dossiê (.docx)
        </a>
      </div>

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

      {dossie.origem === "pncp_real" && (
        <>
          <h2 className="mt-8 text-lg font-semibold">Documentos</h2>
          <p className="mt-1 text-xs text-neutral-400">
            RF-002 — extração nativa de PDF/DOCX (sem OCR pago nesta fase). Backfill parcial, ver
            <code> scripts/backfill_documentos.py</code>.
          </p>
          {documentos.length === 0 ? (
            <p className="mt-2 text-sm italic text-neutral-500">
              Nenhum documento coletado ainda para esta contratação.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {documentos.map((doc, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-neutral-800">{doc.titulo ?? "(sem título)"}</div>
                    <div className="text-xs text-neutral-400">
                      {doc.tipoDocumento} {doc.paginas ? `— ${doc.paginas} página(s)` : ""}
                    </div>
                  </div>
                  {doc.statusExtracao === "extraido_nativo" && (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dossies/${dossie.id}/documento/${doc.id}`}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                      >
                        Buscar no texto
                      </Link>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                        Texto extraído
                      </span>
                    </div>
                  )}
                  {doc.statusExtracao === "requer_ocr" && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      Requer OCR (não construído — RF-002/v2)
                    </span>
                  )}
                  {doc.statusExtracao === "erro" && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                      Formato não suportado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <h2 className="mt-8 text-lg font-semibold">Itens</h2>
      {dossie.itens.length === 0 && (
        <p className="mt-2 text-sm italic text-neutral-500">
          {dossie.origem === "pncp_real"
            ? "Itens ainda não coletados para esta contratação (backfill parcial, ver scripts/backfill_itens.py — nem todas as contratações já foram processadas)."
            : "Relação de itens ainda não extraída do documento (só o metadado de publicação foi coletado até aqui — ver `src/licitimart/itens/`, ainda não construído)."}
        </p>
      )}
      {dossie.itens.length > 0 && (
        <p className="mt-1 text-xs text-neutral-400">
          RF-008 — faixa de preço por correspondência exata de descrição entre editais (não é busca
          semântica, ver RF-005 não construído ainda); com poucas amostras, mostra &quot;dado
          insuficiente&quot; em vez de inventar uma faixa (RF-020).
        </p>
      )}
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-neutral-500">
          <tr>
            <th className="py-2 font-medium">Descrição</th>
            <th className="py-2 font-medium">Qtd.</th>
            <th className="py-2 font-medium">Valor unitário estimado</th>
            <th className="py-2 font-medium">Faixa de preço (RF-008)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {dossie.itens.map((item, i) => {
            const faixa = calcularFaixaPreco(itensComparaveis, item.descricao);
            return (
              <tr key={i}>
                <td className="py-2">{item.descricao}</td>
                <td className="py-2">{item.quantidade}</td>
                <td className="py-2">
                  {item.valorUnitarioEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="py-2 text-xs">
                  {faixa.status === "insuficiente" ? (
                    <span className="italic text-neutral-400">
                      Dado insuficiente ({faixa.amostras} amostra{faixa.amostras === 1 ? "" : "s"})
                    </span>
                  ) : (
                    <span className="text-neutral-600">
                      {faixa.minimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} –{" "}
                      {faixa.maximo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      <span className="text-neutral-400"> (mediana {faixa.mediana.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, n={faixa.amostras})</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
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
