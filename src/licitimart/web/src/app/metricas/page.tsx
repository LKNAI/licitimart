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
      <h1 className="text-2xl font-semibold tracking-tight">Métricas</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-014 — esta tela é a mais &quot;real&quot; das quatro novas: é agregação direta sobre
        {" "}{todos.length} dossiês já carregados ({reais.length} reais do PNCP, {mock.length}{" "}
        ilustrativos), não um número inventado.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">Total de dossiês</div>
          <div className="mt-1 text-2xl font-semibold">{todos.length}</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs text-blue-700">PNCP real</div>
          <div className="mt-1 text-2xl font-semibold text-blue-900">{reais.length}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-xs text-neutral-500">Ilustrativo (mock)</div>
          <div className="mt-1 text-2xl font-semibold text-neutral-700">{mock.length}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">Valor total estimado</div>
          <div className="mt-1 text-2xl font-semibold">{formatarMoeda(valorTotalEstimado)}</div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Distribuição por veredito</h2>
      <p className="text-xs text-neutral-500">
        Quase tudo cai em &quot;Revisão Humana&quot; porque os agentes AG-01 a AG-05 dependem de
        LLM (sem chave configurada) — reflexo do estado real do dado, não um problema da métrica.
      </p>
      <div className="mt-3 space-y-2">
        {porVeredito.map(({ veredito, total }) => {
          const pct = todos.length ? Math.round((total / todos.length) * 100) : 0;
          return (
            <div key={veredito} className="flex items-center gap-3">
              <span className="w-32 text-sm text-neutral-600">{ROTULO_VEREDITO[veredito]}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-neutral-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-20 text-right text-sm text-neutral-500">
                {total} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Procedência do dado real</h2>
      {metadado.disponivel ? (
        <ul className="mt-2 space-y-1 text-sm text-neutral-600">
          <li>Fonte: consulta ao vivo à tabela <code>contratacoes</code> no Supabase (RLS, usuário autenticado)</li>
          <li>Total de linhas na tabela: {metadado.total}</li>
          <li>Maior valor estimado no lote carregado: {formatarMoeda(maiorValor)}</li>
        </ul>
      ) : (
        <p className="mt-2 text-sm italic text-neutral-500">
          Não foi possível consultar o Supabase agora.
        </p>
      )}
    </div>
  );
}
