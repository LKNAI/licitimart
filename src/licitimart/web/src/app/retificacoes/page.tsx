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
      <h1 className="font-display text-3xl font-semibold text-ink">Diff de Retificação</h1>
      <p className="mt-2 max-w-[75ch] text-[14.5px] leading-relaxed text-ink-soft">
        Retificação de edital tratada como evento de primeira classe, com registro campo a campo,
        não como republicação silenciosa. O coletor compara cada coleta contra o estado anterior
        de cada contratação antes de sobrescrever.
      </p>
      <div className="mt-4 border-l-2 border-line-strong bg-surface px-4 py-3 text-[12.5px] leading-relaxed text-ink-faint">
        Escopo desta fase: diff sobre os campos estruturados já coletados (objeto, modalidade,
        valor, data, órgão) — não sobre o texto completo do edital em PDF. Alerta proativo
        (e-mail/push) fica para depois.
      </div>

      {error && <p className="mt-4 text-[13px] text-seal-red">{error.message}</p>}

      {retificacoes.length === 0 ? (
        <div className="mt-8 border border-dashed border-line-strong bg-surface p-6 text-[13.5px] italic text-ink-faint">
          Nenhuma retificação detectada ainda — o coletor só grava uma linha aqui quando um campo
          muda entre duas coletas da mesma contratação. Com uma única rodada de coleta até agora,
          isso é esperado: é &quot;ainda não aconteceu&quot;, não &quot;não funciona&quot;.
        </div>
      ) : (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {retificacoes.map((r) => (
            <div key={r.id} className="py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={r.contratacoes ? `/dossies/real-${r.contratacoes.id}` : "/dossies"}
                  className="text-[14px] font-medium text-ink hover:text-seal-green"
                >
                  {r.contratacoes?.objeto ?? "(contratação removida)"}
                </Link>
                <span className="font-mono text-[12px] text-ink-faint">
                  {new Date(r.detectado_em).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-ink-faint">{r.contratacoes?.orgao}</div>

              <div className="mt-3 text-[12.5px] font-medium text-seal-amber">
                Campo alterado: {ROTULO_CAMPO[r.campo] ?? r.campo}
              </div>

              {r.campo === "objeto" ? (
                <div className="mt-2 bg-surface p-3 font-mono text-[13px] leading-relaxed">
                  {diffPalavras(r.valor_anterior ?? "", r.valor_novo ?? "").map((trecho, i) => {
                    if (trecho.tipo === "igual") return <span key={i}>{trecho.texto}</span>;
                    if (trecho.tipo === "removido")
                      return (
                        <span key={i} className="bg-seal-red-bg text-seal-red line-through">
                          {trecho.texto}
                        </span>
                      );
                    return (
                      <span key={i} className="bg-seal-green-bg text-seal-green">
                        {trecho.texto}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px]">
                  <span className="bg-seal-red-bg px-2 py-1 text-seal-red line-through">
                    {r.valor_anterior ?? "—"}
                  </span>
                  <span className="text-ink-faint">→</span>
                  <span className="bg-seal-green-bg px-2 py-1 text-seal-green">
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
