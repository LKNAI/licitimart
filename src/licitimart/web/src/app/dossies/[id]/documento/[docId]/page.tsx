"use client";

import { use, useActionState } from "react";
import Link from "next/link";
import { buscarNoDocumento, type OcorrenciaBusca } from "./actions";
import { campoClasse } from "@/components/ui";

const estadoInicial: { erro: string; ocorrencias: OcorrenciaBusca[] } = { erro: "", ocorrencias: [] };

export default function DocumentoBuscaPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = use(params);
  const documentoId = Number(docId);

  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => {
      const termo = String(formData.get("termo") ?? "");
      return (await buscarNoDocumento(documentoId, termo)) ?? estadoInicial;
    },
    estadoInicial
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/dossies/${id}`} className="text-[13px] text-ink-soft hover:text-ink">
        ← Voltar ao dossiê
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Buscar no documento</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        Busca sobre o texto real extraído do edital, com a página exata de cada ocorrência. Mostra
        a localização real no documento — não é renderização visual do PDF (aditivo depois), mas
        já é prova real, não achado inventado.
      </p>

      <form action={acao} className="mt-6 flex gap-2">
        <input
          name="termo"
          required
          placeholder="ex.: prazo de entrega"
          className={`flex-1 ${campoClasse}`}
        />
        <button type="submit" disabled={pendente} className="shrink-0 rounded-[4px] bg-ink px-5 text-[14px] font-medium text-paper hover:bg-seal-green disabled:opacity-50">
          {pendente ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {estado.erro && <p className="mt-4 text-[13px] text-seal-red">{estado.erro}</p>}

      {estado.ocorrencias.length > 0 && (
        <div className="mt-6 divide-y divide-line border-y border-line">
          {estado.ocorrencias.map((o, i) => (
            <div key={i} className="py-4">
              <div className="font-mono text-[12px] font-medium text-seal-amber">
                {o.pagina !== null ? `página ${o.pagina}` : "documento sem paginação fixa (DOCX)"}
              </div>
              <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-ink-soft">{o.trecho}</p>
            </div>
          ))}
        </div>
      )}

      {!pendente && estado.ocorrencias.length === 0 && !estado.erro && (
        <p className="mt-6 text-[13.5px] italic text-ink-faint">Nenhuma busca feita ainda.</p>
      )}
    </div>
  );
}
