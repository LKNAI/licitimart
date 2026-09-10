import { ROTULO_VEREDITO, Veredito } from "@/lib/mock/dossies";
import { buscarMetricas } from "@/lib/data/dossiesSupabase";

// Fase O: agregado direto do Postgres (RPC metricas_contratacoes), não
// reduce sobre um array de até 1.000 linhas carregado em memória -- ver
// plan_fase_o.md. O mock ilustrativo (3 itens fixos) é somado à parte,
// sem entrar na agregação SQL.
const MOCK_TOTAL = 3;
const MOCK_POR_VEREDITO: Record<Veredito, number> = { go: 1, revisao_humana: 1, no_go: 1 };

function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default async function MetricasPage() {
  const metricas = await buscarMetricas();

  const totalGeral = metricas.total + MOCK_TOTAL;
  const porVeredito = (["go", "revisao_humana", "no_go"] as Veredito[]).map((v) => ({
    veredito: v,
    total: metricas.porVeredito[v] + MOCK_POR_VEREDITO[v],
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Métricas</h1>
      <p className="mt-2 max-w-[75ch] text-[14.5px] leading-relaxed text-ink-soft">
        Esta tela é agregação SQL sobre a base inteira ({metricas.total} reais do PNCP,{" "}
        {MOCK_TOTAL} ilustrativos) — não um recorte carregado em memória.
      </p>

      <div className="mt-8 grid grid-cols-2 divide-x divide-y divide-line border border-line md:grid-cols-4 md:divide-y-0">
        <div className="p-5">
          <div className="text-[12px] text-ink-faint">Total de dossiês</div>
          <div className="mt-1 font-display text-[26px] font-semibold text-ink">{totalGeral}</div>
        </div>
        <div className="border-l-2 border-l-seal-blue p-5">
          <div className="text-[12px] text-seal-blue">PNCP real</div>
          <div className="mt-1 font-display text-[26px] font-semibold text-seal-blue">{metricas.total}</div>
        </div>
        <div className="p-5">
          <div className="text-[12px] text-ink-faint">Ilustrativo (mock)</div>
          <div className="mt-1 font-display text-[26px] font-semibold text-ink-soft">{MOCK_TOTAL}</div>
        </div>
        <div className="p-5">
          <div className="text-[12px] text-ink-faint">Valor total estimado</div>
          <div className="mt-1 font-mono text-[21px] font-semibold text-ink">{formatarMoeda(metricas.valorTotal)}</div>
        </div>
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Distribuição por veredito</h2>
      <p className="text-[12.5px] text-ink-faint">
        Quase tudo cai em &quot;Revisão Humana&quot; porque os agentes de IA dependem de LLM (sem
        chave configurada) — reflexo do estado real do dado, não um problema da métrica.
      </p>
      <div className="mt-4 space-y-2.5">
        {porVeredito.map(({ veredito, total }) => {
          const pct = totalGeral ? Math.round((total / totalGeral) * 100) : 0;
          return (
            <div key={veredito} className="flex items-center gap-3">
              <span className="w-32 text-[13.5px] text-ink-soft">{ROTULO_VEREDITO[veredito]}</span>
              <div className="h-2 flex-1 overflow-hidden bg-surface">
                <div className="h-full bg-ink-soft" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-24 text-right font-mono text-[12.5px] text-ink-faint">
                {total} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Resultado real da disputa</h2>
      <p className="text-[12.5px] text-ink-faint">
        Só entre os marcados &quot;Go&quot; — preenchido manualmente pelo usuário depois do
        pregão, não há fonte automática de resultado. RF-014 (incremento de participação) depende
        disso, não só da contagem de decisão acima.
      </p>
      {metricas.porVeredito.go === 0 ? (
        <p className="mt-3 text-[13.5px] italic text-ink-faint">
          Nenhuma contratação real marcada &quot;Go&quot; ainda.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 divide-x divide-line border border-line">
          <div className="p-4">
            <div className="text-[12px] text-seal-green">Ganhou</div>
            <div className="mt-1 font-display text-[22px] font-semibold text-seal-green">{metricas.ganhouTotal}</div>
          </div>
          <div className="p-4">
            <div className="text-[12px] text-seal-red">Perdeu</div>
            <div className="mt-1 font-display text-[22px] font-semibold text-seal-red">{metricas.perdeuTotal}</div>
          </div>
          <div className="p-4">
            <div className="text-[12px] text-ink-faint">Aguardando</div>
            <div className="mt-1 font-display text-[22px] font-semibold text-ink-soft">{metricas.aguardandoTotal}</div>
          </div>
        </div>
      )}
      {(metricas.ganhouTotal + metricas.perdeuTotal) > 0 && (
        <p className="mt-2 text-[12.5px] text-ink-soft">
          Taxa de vitória (entre resultados já conhecidos):{" "}
          <span className="font-mono font-medium text-ink">
            {Math.round((metricas.ganhouTotal / (metricas.ganhouTotal + metricas.perdeuTotal)) * 100)}%
          </span>
        </p>
      )}

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Procedência do dado real</h2>
      {metricas.disponivel ? (
        <ul className="mt-2 space-y-1 text-[13.5px] text-ink-soft">
          <li>Fonte: agregação SQL ao vivo (RPC) sobre a tabela <code className="font-mono text-[12.5px]">contratacoes</code> no Supabase (RLS, usuário autenticado)</li>
          <li>Total de linhas na tabela: {metricas.total}</li>
          <li>Maior valor estimado na base: {formatarMoeda(metricas.maiorValor)}</li>
        </ul>
      ) : (
        <p className="mt-2 text-[13.5px] italic text-ink-faint">
          Não foi possível consultar o Supabase agora.
        </p>
      )}
    </div>
  );
}
