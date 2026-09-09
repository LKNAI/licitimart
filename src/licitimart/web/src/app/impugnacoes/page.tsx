import { carregarMinutasExemplo } from "@/lib/data/minutasExemplo";

export default async function ImpugnacoesPage() {
  const { disponivel, payload } = await carregarMinutasExemplo();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Impugnação Assistida</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-017 — diferencial de mercado: a mesma lente que detecta restritividade indevida já
        gera a minuta de contestação. As minutas abaixo são <strong>exemplos gerados pelo motor
        determinístico real</strong> ({" "}
        {payload?.geradoPor ?? "spikes/03_impugnacao_assistida"}) sobre editais sintéticos —
        nenhum dossiê real do PNCP foi analisado ainda (isso exige os agentes AG-01 a AG-05,
        que dependem de uma chave de LLM não configurada neste ambiente).
      </p>

      {!disponivel && (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm italic text-neutral-500">
          Nenhum exemplo carregado — rode <code>python scripts/exportar_minutas_exemplo.py</code>.
        </p>
      )}

      <div className="mt-6 space-y-8">
        {payload?.exemplos.map((exemplo, i) => (
          <div key={i} className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="text-sm font-medium text-neutral-900">{exemplo.contexto.objeto}</div>
            <div className="text-xs text-neutral-500">{exemplo.contexto.orgao}</div>
            <div className="text-xs text-neutral-400">{exemplo.contexto.numero_controle_pncp}</div>

            <div className="mt-3 rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
              <span className="font-medium">Trecho sintético do edital: </span>
              {exemplo.textoEditalSintetico}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {exemplo.achados.map((achado, j) => (
                <span
                  key={j}
                  className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200"
                  title={achado.fundamentacao_candidata}
                >
                  {achado.explicacao}
                </span>
              ))}
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-neutral-700 hover:text-neutral-900">
                Ver minuta gerada (rascunho)
              </summary>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-amber-200 bg-amber-50 p-4 font-mono text-xs text-neutral-800">
                {exemplo.minutaMarkdown}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
