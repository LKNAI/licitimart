import { carregarMinutasExemplo } from "@/lib/data/minutasExemplo";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

interface ImpugnacaoReal {
  id: number;
  contexto: { numero_controle_pncp: string; orgao: string; objeto: string; achados: { explicacao: string; fundamentacaoCandidata: string }[] };
  minutaMarkdown: string;
  criadoEm: string;
}

async function buscarImpugnacoesReais(): Promise<ImpugnacaoReal[]> {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: membresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membresia) return [];

  const { data } = await supabase
    .from("impugnacoes")
    .select("id, contexto, minuta_markdown, criado_em")
    .eq("tenant_id", membresia.tenant_id)
    .order("criado_em", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    contexto: row.contexto,
    minutaMarkdown: row.minuta_markdown,
    criadoEm: row.criado_em,
  }));
}

export default async function ImpugnacoesPage() {
  const { disponivel, payload } = await carregarMinutasExemplo();
  const impugnacoesReais = await buscarImpugnacoesReais();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Impugnação Assistida</h1>
      <p className="mt-2 max-w-[75ch] text-[14.5px] leading-relaxed text-ink-soft">
        Detector determinístico (regex + palavra-chave, sem LLM) — a mesma lente que detecta
        restritividade indevida já gera a minuta de contestação, por template fixo, não por
        geração de linguagem.
      </p>

      {impugnacoesReais.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-ink">Editais reais do PNCP</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Rodado sob demanda a partir de <code className="font-mono text-[11.5px]">/dossies/[id]</code>,
            sobre o texto real extraído do documento — ainda{" "}
            <strong className="text-ink">não validado formalmente</strong> contra edital real e
            variado (o detector só foi testado em 14 casos sintéticos, ver{" "}
            <code className="font-mono text-[11.5px]">spikes/03_impugnacao_assistida</code>).
            Achado é candidato, não conclusão jurídica — RN-006 sempre no topo/rodapé da minuta.
          </p>
          <div className="mt-4 space-y-10">
            {impugnacoesReais.map((imp) => (
              <div key={imp.id} className="border-t-2 border-t-seal-red pt-4">
                <div className="text-[15px] font-medium text-ink">{imp.contexto.objeto}</div>
                <div className="text-[12.5px] text-ink-faint">{imp.contexto.orgao}</div>
                <div className="font-mono text-[11.5px] text-ink-faint">{imp.contexto.numero_controle_pncp}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {imp.contexto.achados.map((achado, j) => (
                    <span
                      key={j}
                      className="border-l-[3px] border-seal-red bg-seal-red-bg px-2.5 py-1 text-[12px] font-medium text-seal-red"
                      title={achado.fundamentacaoCandidata}
                    >
                      {achado.explicacao}
                    </span>
                  ))}
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-[13.5px] font-medium text-ink-soft hover:text-ink">
                    Ver minuta gerada (rascunho)
                  </summary>
                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap border-l-2 border-seal-amber bg-surface p-4 font-mono text-[12.5px] leading-relaxed text-ink">
                    {imp.minutaMarkdown}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">Exemplos sintéticos</h2>
        <p className="mt-1 text-[12.5px] text-ink-faint">
          Editais fabricados de propósito pra conter cada padrão — servem pra mostrar o formato da
          minuta, não como prova de acurácia em texto real (
          {payload?.geradoPor ?? "spikes/03_impugnacao_assistida"}).
        </p>

        {!disponivel && (
          <p className="mt-6 border border-dashed border-line-strong bg-surface p-4 text-[13.5px] italic text-ink-faint">
            Nenhum exemplo carregado — rode <code className="font-mono text-[12.5px]">python scripts/exportar_minutas_exemplo.py</code>.
          </p>
        )}

        <div className="mt-4 space-y-10">
          {payload?.exemplos.map((exemplo, i) => (
            <div key={i} className="border-t-2 border-t-line-strong pt-4">
              <div className="text-[15px] font-medium text-ink">{exemplo.contexto.objeto}</div>
              <div className="text-[12.5px] text-ink-faint">{exemplo.contexto.orgao}</div>
              <div className="font-mono text-[11.5px] text-ink-faint">{exemplo.contexto.numero_controle_pncp}</div>

              <div className="mt-3 border-l-2 border-line-strong bg-surface p-3 text-[12.5px] leading-relaxed text-ink-soft">
                <span className="font-medium text-ink">Trecho sintético do edital: </span>
                {exemplo.textoEditalSintetico}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {exemplo.achados.map((achado, j) => (
                  <span
                    key={j}
                    className="border-l-[3px] border-seal-red bg-seal-red-bg px-2.5 py-1 text-[12px] font-medium text-seal-red"
                    title={achado.fundamentacao_candidata}
                  >
                    {achado.explicacao}
                  </span>
                ))}
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-[13.5px] font-medium text-ink-soft hover:text-ink">
                  Ver minuta gerada (rascunho)
                </summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap border-l-2 border-seal-amber bg-surface p-4 font-mono text-[12.5px] leading-relaxed text-ink">
                  {exemplo.minutaMarkdown}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
