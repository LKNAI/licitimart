import Link from "next/link";
import { listarTodosDossies, ROTULO_ORIGEM, ROTULO_VEREDITO, Veredito } from "@/lib/mock/dossies";

// Ordem deliberada: Go, Revisão Humana, No-Go -- Revisão Humana no meio,
// coluna de primeira classe, nao um "extra" ao lado (ERS secao 4.1, regra 2).
const COLUNAS: Veredito[] = ["go", "revisao_humana", "no_go"];
const CARDS_POR_COLUNA = 6;

const COR_COLUNA: Record<Veredito, string> = {
  go: "border-t-seal-green",
  revisao_humana: "border-t-seal-amber",
  no_go: "border-t-seal-red",
};

export default async function PipelinePage() {
  const todos = await listarTodosDossies();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Pipeline Go / No-Go</h1>
      <p className="mt-2 max-w-[80ch] text-[14px] leading-relaxed text-ink-soft">
        &quot;Revisão Humana&quot; é resultado esperado e frequente, não uma saída residual — por
        isso fica no meio, do mesmo tamanho das outras duas. Hoje o veredito de dossiês reais só
        muda por decisão humana (abra o dossiê e marque Go, No-Go ou Revisão Humana).
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {COLUNAS.map((veredito) => {
          const itensColuna = todos.filter((d) => d.veredito === veredito);
          const visiveis = itensColuna.slice(0, CARDS_POR_COLUNA);
          const restantes = itensColuna.length - visiveis.length;

          return (
            <div key={veredito} className={`border-t-2 pt-3 ${COR_COLUNA[veredito]}`}>
              <h2 className="font-display text-[15px] font-semibold text-ink">
                {ROTULO_VEREDITO[veredito]}
                <span className="ml-1.5 font-mono text-[12px] font-normal text-ink-faint">({itensColuna.length})</span>
              </h2>
              <div className="mt-3 divide-y divide-line">
                {visiveis.map((d) => (
                  <Link key={d.id} href={`/dossies/${d.id}`} className="block py-3 hover:bg-surface">
                    <div className="text-[13.5px] font-medium leading-snug text-ink">{d.objeto}</div>
                    <div className="mt-1 text-[12px] text-ink-faint">{d.orgao}</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="font-mono text-[12px] text-ink-soft">
                        {d.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className="text-[10.5px] text-ink-faint">{ROTULO_ORIGEM[d.origem]}</span>
                    </div>
                  </Link>
                ))}
                {restantes > 0 && (
                  <Link href="/dossies" className="block py-3 text-center text-[12.5px] text-ink-soft hover:text-ink">
                    + {restantes} outro(s) — ver em Dossiês
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
