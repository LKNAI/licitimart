import { listarTodosDossies, ROTULO_VEREDITO, Veredito } from "@/lib/mock/dossies";
import { carregarDossiesSupabase } from "@/lib/data/dossiesSupabase";

function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default async function MetricasPage() {
  const todos = await listarTodosDossies();
  const { metadado } = await carregarDossiesSupabase();

  const reais = todos.filter((d) => d.origem === "pncp_real");
  const mock = todos.filter((d) => d.origem === "mock_ilustrativo");

  const porVeredito = (["go", "revisao_humana", "no_go"] as Veredito[]).map((v) => ({
    veredito: v,
    total: todos.filter((d) => d.veredito === v).length,
  }));

  const valorTotalEstimado = todos.reduce((soma, d) => soma + d.valorEstimado, 0);
  const maiorValor = todos.reduce((max, d) => Math.max(max, d.valorEstimado), 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Métricas</h1>
      <p className="mt-2 max-w-[75ch] text-[14.5px] leading-relaxed text-ink-soft">
        Esta tela é agregação direta sobre {todos.length} dossiês já carregados ({reais.length}{" "}
        reais do PNCP, {mock.length} ilustrativos) — não um número inventado.
      </p>

      <div className="mt-8 grid grid-cols-2 divide-x divide-y divide-line border border-line md:grid-cols-4 md:divide-y-0">
        <div className="p-5">
          <div className="text-[12px] text-ink-faint">Total de dossiês</div>
          <div className="mt-1 font-display text-[26px] font-semibold text-ink">{todos.length}</div>
        </div>
        <div className="border-l-2 border-l-seal-blue p-5">
          <div className="text-[12px] text-seal-blue">PNCP real</div>
          <div className="mt-1 font-display text-[26px] font-semibold text-seal-blue">{reais.length}</div>
        </div>
        <div className="p-5">
          <div className="text-[12px] text-ink-faint">Ilustrativo (mock)</div>
          <div className="mt-1 font-display text-[26px] font-semibold text-ink-soft">{mock.length}</div>
        </div>
        <div className="p-5">
          <div className="text-[12px] text-ink-faint">Valor total estimado</div>
          <div className="mt-1 font-mono text-[21px] font-semibold text-ink">{formatarMoeda(valorTotalEstimado)}</div>
        </div>
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Distribuição por veredito</h2>
      <p className="text-[12.5px] text-ink-faint">
        Quase tudo cai em &quot;Revisão Humana&quot; porque os agentes de IA dependem de LLM (sem
        chave configurada) — reflexo do estado real do dado, não um problema da métrica.
      </p>
      <div className="mt-4 space-y-2.5">
        {porVeredito.map(({ veredito, total }) => {
          const pct = todos.length ? Math.round((total / todos.length) * 100) : 0;
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

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Procedência do dado real</h2>
      {metadado.disponivel ? (
        <ul className="mt-2 space-y-1 text-[13.5px] text-ink-soft">
          <li>Fonte: consulta ao vivo à tabela <code className="font-mono text-[12.5px]">contratacoes</code> no Supabase (RLS, usuário autenticado)</li>
          <li>Total de linhas na tabela: {metadado.total}</li>
          <li>Maior valor estimado no lote carregado: {formatarMoeda(maiorValor)}</li>
        </ul>
      ) : (
        <p className="mt-2 text-[13.5px] italic text-ink-faint">
          Não foi possível consultar o Supabase agora.
        </p>
      )}
    </div>
  );
}
