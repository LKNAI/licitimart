import { carregarMinutasExemplo } from "@/lib/data/minutasExemplo";

export default async function ImpugnacoesPage() {
  const { disponivel, payload } = await carregarMinutasExemplo();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Impugnação Assistida</h1>
      <p className="mt-2 max-w-[75ch] text-[14.5px] leading-relaxed text-ink-soft">
        A mesma lente que detecta restritividade indevida já gera a minuta de contestação. As
        minutas abaixo são geradas pelo motor determinístico real (
        {payload?.geradoPor ?? "spikes/03_impugnacao_assistida"}) sobre editais sintéticos —
        nenhum dossiê real do PNCP foi analisado ainda, isso exige os agentes de IA, que dependem
        de uma chave de LLM não configurada neste ambiente.
      </p>

      {!disponivel && (
        <p className="mt-6 border border-dashed border-line-strong bg-surface p-4 text-[13.5px] italic text-ink-faint">
          Nenhum exemplo carregado — rode <code className="font-mono text-[12.5px]">python scripts/exportar_minutas_exemplo.py</code>.
        </p>
      )}

      <div className="mt-8 space-y-10">
        {payload?.exemplos.map((exemplo, i) => (
          <div key={i} className="border-t-2 border-t-seal-red pt-4">
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
    </div>
  );
}
