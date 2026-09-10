import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarDossie, ROTULO_CONFIABILIDADE, ROTULO_ORIGEM, ROTULO_VEREDITO } from "@/lib/mock/dossies";
import { buscarItensComparaveis, buscarDocumentosContratacao } from "@/lib/data/dossiesSupabase";
import { calcularFaixaPreco } from "@/lib/precificacao";
import { SeloCarimbo, SeloCompacto, type Tom } from "@/components/Selo";
import VeredictoBotoes from "./VeredictoBotoes";

const TOM_CONFIABILIDADE: Record<string, Tom> = {
  confirmado: "green",
  fonte_unica: "amber",
  divergente: "red",
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
        <Link href="/dossies" className="text-[13px] text-ink-soft hover:text-ink">
          ← Dossiês
        </Link>
        <a
          href={`/dossies/${dossie.id}/exportar`}
          className="rounded-[4px] border border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-surface"
        >
          Exportar dossiê (.docx)
        </a>
      </div>

      <h1 className="mt-3 font-display text-[28px] font-semibold leading-tight text-ink">{dossie.objeto}</h1>
      <p className="mt-1 text-[14.5px] text-ink-soft">{dossie.orgao}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[12.5px] text-ink-faint">
        <span>{dossie.modalidade}</span>
        <span className="text-line-strong">·</span>
        <span>{dossie.numeroControlePNCP}</span>
        <span className="text-line-strong">·</span>
        <span>publicado em {new Date(dossie.dataPublicacao).toLocaleDateString("pt-BR")}</span>
        <span className="text-line-strong">·</span>
        <span>{ROTULO_ORIGEM[dossie.origem]}</span>
      </div>

      <div className="mt-8 flex flex-wrap items-start justify-between gap-6 border-y border-line py-6">
        <div>
          <div className="text-[12px] text-ink-faint">Veredito</div>
          {dossie.origem === "pncp_real" ? (
            <div className="mt-2.5">
              <VeredictoBotoes
                contratacaoId={Number(dossie.id.replace("real-", ""))}
                vereditoAtual={dossie.veredito}
              />
            </div>
          ) : (
            <div className="mt-1 font-display text-xl font-semibold text-ink">{ROTULO_VEREDITO[dossie.veredito]}</div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <SeloCarimbo tom={TOM_CONFIABILIDADE[dossie.confiabilidade]} titulo={ROTULO_CONFIABILIDADE[dossie.confiabilidade].split(" (")[0]} />
          <span className="text-[11px] text-ink-faint">Selo de Confiabilidade</span>
        </div>
      </div>

      {dossie.origem === "pncp_real" && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-ink">Documentos</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Extração nativa de PDF/DOCX (sem OCR pago nesta fase) — coleta parcial em andamento.
          </p>
          {documentos.length === 0 ? (
            <p className="mt-3 text-[13.5px] italic text-ink-faint">
              Nenhum documento coletado ainda para esta contratação.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-line border-y border-line">
              {documentos.map((doc, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-[14px] font-medium text-ink">{doc.titulo ?? "(sem título)"}</div>
                    <div className="text-[12.5px] text-ink-faint">
                      {doc.tipoDocumento} {doc.paginas ? `— ${doc.paginas} página(s)` : ""}
                    </div>
                  </div>
                  {doc.statusExtracao === "extraido_nativo" && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/dossies/${dossie.id}/documento/${doc.id}`}
                        className="rounded-[4px] border border-line-strong px-2.5 py-1 text-[12.5px] text-ink-soft hover:bg-surface"
                      >
                        Buscar no texto
                      </Link>
                      <SeloCompacto tom="green">Texto extraído</SeloCompacto>
                    </div>
                  )}
                  {doc.statusExtracao === "requer_ocr" && (
                    <SeloCompacto tom="amber">Requer OCR (não construído)</SeloCompacto>
                  )}
                  {doc.statusExtracao === "erro" && (
                    <SeloCompacto tom="neutral">Formato não suportado</SeloCompacto>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Itens</h2>
        {dossie.itens.length === 0 && (
          <p className="mt-2 text-[13.5px] italic text-ink-faint">
            {dossie.origem === "pncp_real"
              ? "Itens ainda não coletados para esta contratação (coleta parcial em andamento)."
              : "Relação de itens ainda não extraída do documento (só o metadado de publicação foi coletado até aqui)."}
          </p>
        )}
        {dossie.itens.length > 0 && (
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Faixa de preço por correspondência exata de descrição entre editais (não é busca
            semântica) — com poucas amostras, mostra &quot;dado insuficiente&quot; em vez de
            inventar uma faixa.
          </p>
        )}
        {dossie.itens.length > 0 && (
          <div className="mt-3 overflow-x-auto border-y border-line">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-ink-faint">
                  <th className="py-2 pr-4 font-medium">Descrição</th>
                  <th className="py-2 pr-4 text-right font-medium">Qtd.</th>
                  <th className="py-2 pr-4 text-right font-medium">Valor unitário estimado</th>
                  <th className="py-2 font-medium">Faixa de preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dossie.itens.map((item, i) => {
                  const faixa = calcularFaixaPreco(itensComparaveis, item.descricao);
                  return (
                    <tr key={i}>
                      <td className="py-2.5 pr-4 text-ink">{item.descricao}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-ink-soft">{item.quantidade}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-ink-soft">{moeda(item.valorUnitarioEstimado)}</td>
                      <td className="py-2.5 text-[12.5px]">
                        {faixa.status === "insuficiente" ? (
                          <span className="italic text-ink-faint">
                            Dado insuficiente ({faixa.amostras} amostra{faixa.amostras === 1 ? "" : "s"})
                          </span>
                        ) : (
                          <span className="font-mono text-ink-soft">
                            {moeda(faixa.minimo)} – {moeda(faixa.maximo)}
                            <span className="text-ink-faint"> (mediana {moeda(faixa.mediana)}, n={faixa.amostras})</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 pb-12">
        <h2 className="font-display text-lg font-semibold text-ink">Achados</h2>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          Toda citação levaria, em produção, ao trecho realçado na página exata do documento de
          origem.
        </p>
        <div className="mt-3 space-y-3">
          {dossie.achados.length === 0 && (
            <div className="rounded-[6px] border border-dashed border-line-strong bg-surface p-4 text-[13.5px] italic text-ink-faint">
              Nenhuma análise feita ainda sobre este dossiê — os agentes de IA dependem de uma
              chave de LLM não configurada neste ambiente. Isso é diferente de &quot;sem
              achado&quot;: é &quot;ainda não avaliado&quot;.
            </div>
          )}
          {dossie.achados.map((achado, i) =>
            achado.confianca === "dado_insuficiente" ? (
              <div key={i} className="rounded-[6px] border border-line bg-surface p-4">
                <div className="text-[13.5px] font-medium text-ink-soft">{achado.criterio}</div>
                <div className="mt-1 text-[13px] italic text-ink-faint">
                  Dado insuficiente — não localizado nos documentos disponíveis. Nunca inferido
                  como &quot;requisito não cumprido&quot;.
                </div>
              </div>
            ) : (
              <div key={i} className="rounded-[6px] border border-line bg-surface-raised p-4">
                <div className="text-[13.5px] font-medium text-ink">{achado.criterio}</div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{achado.achado}</p>
                <button className="mt-2.5 rounded-[4px] border border-line-strong px-2.5 py-1 text-[12.5px] text-ink-soft hover:bg-surface">
                  Abrir na página {achado.pagina} — &quot;{achado.citacao}&quot;
                </button>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
