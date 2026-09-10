import Link from "next/link";
import { diffPalavras } from "@/lib/diffSimples";
import { criarClienteSupabaseServer } from "@/lib/supabase/server";

const ROTULO_CAMPO: Record<string, string> = {
  objeto: "Objeto",
  modalidade: "Modalidade",
  valor_estimado: "Valor estimado",
  data_publicacao: "Data de publicação",
  orgao: "Órgão",
  municipio_uf: "Município/UF",
};

interface RetificacaoRow {
  id: number;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  detectado_em: string;
  contratacoes: { id: number; objeto: string | null; orgao: string | null } | null;
}

export default async function RetificacoesPage() {
  const supabase = await criarClienteSupabaseServer();
  const { data, error } = await supabase
    .from("retificacoes")
    .select("id, campo, valor_anterior, valor_novo, detectado_em, contratacoes(id, objeto, orgao)")
    .order("detectado_em", { ascending: false })
    .limit(100)
    .returns<RetificacaoRow[]>();

  const retificacoes = data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Diff de Retificação</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-018 — diferencial de mercado: retificação de edital tratada como evento de primeira
        classe, com registro campo a campo, não como republicação silenciosa. Dado real: o
        coletor compara cada coleta contra o estado anterior de cada contratação antes de
        sobrescrever (<code>src/licitimart/ingestao/supabase_store.py</code>).
      </p>
      <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
        Escopo desta fase: diff sobre os campos estruturados já coletados (objeto, modalidade,
        valor, data, órgão) — não sobre o texto completo do edital em PDF, que depende de RF-002
        (OCR/extração), ainda não construído. Alerta proativo (e-mail/push) fica para depois.
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}

      {retificacoes.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm italic text-neutral-500">
          Nenhuma retificação detectada ainda — o coletor só grava uma linha aqui quando um campo
          muda entre duas coletas da mesma contratação. Com uma única rodada de coleta até agora,
          isso é esperado: é &quot;ainda não aconteceu&quot;, não &quot;não funciona&quot;.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {retificacoes.map((r) => (
            <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                <Link
                  href={r.contratacoes ? `/dossies/real-${r.contratacoes.id}` : "/dossies"}
                  className="font-medium text-neutral-700 hover:underline"
                >
                  {r.contratacoes?.objeto ?? "(contratação removida)"}
                </Link>
                <span>{new Date(r.detectado_em).toLocaleString("pt-BR")}</span>
              </div>
              <div className="mt-1 text-xs text-neutral-400">{r.contratacoes?.orgao}</div>

              <div className="mt-3 text-sm font-semibold text-amber-700">
                Campo alterado: {ROTULO_CAMPO[r.campo] ?? r.campo}
              </div>

              {r.campo === "objeto" ? (
                <div className="mt-2 rounded-md bg-neutral-50 p-3 font-mono text-sm leading-relaxed">
                  {diffPalavras(r.valor_anterior ?? "", r.valor_novo ?? "").map((trecho, i) => {
                    if (trecho.tipo === "igual") return <span key={i}>{trecho.texto}</span>;
                    if (trecho.tipo === "removido")
                      return (
                        <span key={i} className="bg-red-100 text-red-700 line-through">
                          {trecho.texto}
                        </span>
                      );
                    return (
                      <span key={i} className="bg-emerald-100 text-emerald-800">
                        {trecho.texto}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-red-100 px-2 py-1 text-red-700 line-through">
                    {r.valor_anterior ?? "—"}
                  </span>
                  <span className="text-neutral-400">→</span>
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">
                    {r.valor_novo ?? "—"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
