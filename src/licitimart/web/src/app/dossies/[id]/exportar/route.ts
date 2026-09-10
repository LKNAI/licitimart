// RF-007 (parte 2) -- dossie de decisao exportavel em .docx, arquivavel
// para comite de compliance interno do cliente. Route Handler, nao
// Server Action -- download binario com Content-Disposition correto e
// natural aqui, nao numa acao pensada pra retornar dado serializavel.
import { NextResponse, type NextRequest } from "next/server";
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun, WidthType } from "docx";
import { buscarDossie, ROTULO_CONFIABILIDADE, ROTULO_ORIGEM, ROTULO_VEREDITO } from "@/lib/mock/dossies";

function celula(texto: string, cabecalho = false) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: texto, bold: cabecalho })] })],
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dossie = await buscarDossie(id);
  if (!dossie) {
    return NextResponse.json({ erro: "Dossiê não encontrado." }, { status: 404 });
  }

  const linhasItens = dossie.itens.length
    ? dossie.itens.map(
        (item) =>
          new TableRow({
            children: [
              celula(item.descricao),
              celula(String(item.quantidade)),
              celula(item.valorUnitarioEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })),
            ],
          })
      )
    : [];

  const secoesAchados =
    dossie.achados.length === 0
      ? [new Paragraph({ text: "Nenhuma análise automatizada disponível para este dossiê no momento da exportação." })]
      : dossie.achados.flatMap((achado) => [
          new Paragraph({ heading: HeadingLevel.HEADING_3, text: achado.criterio }),
          achado.confianca === "dado_insuficiente"
            ? new Paragraph({ text: "Dado insuficiente — não localizado nos documentos disponíveis." })
            : new Paragraph({ text: `${achado.achado} (pág. ${achado.pagina}: "${achado.citacao}")` }),
        ]);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, text: "Dossiê de Decisão — Licitimart" }),
          new Paragraph({ text: `Gerado em ${new Date().toLocaleString("pt-BR")}` }),
          new Paragraph({ text: `Origem do dado: ${ROTULO_ORIGEM[dossie.origem]}`, spacing: { after: 200 } }),

          new Paragraph({ heading: HeadingLevel.HEADING_1, text: dossie.objeto }),
          new Paragraph({ text: `Órgão: ${dossie.orgao}` }),
          new Paragraph({ text: `Número de controle PNCP: ${dossie.numeroControlePNCP}` }),
          new Paragraph({ text: `Modalidade: ${dossie.modalidade}` }),
          new Paragraph({
            text: `Valor estimado: ${dossie.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
          }),
          new Paragraph({ text: `Data de publicação: ${new Date(dossie.dataPublicacao).toLocaleDateString("pt-BR")}` }),
          new Paragraph({
            text: `Selo de Confiabilidade: ${ROTULO_CONFIABILIDADE[dossie.confiabilidade]}`,
            spacing: { after: 200 },
          }),

          new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Veredito" }),
          new Paragraph({ children: [new TextRun({ text: ROTULO_VEREDITO[dossie.veredito], bold: true, size: 28 })] }),
          new Paragraph({
            text: "Decisão por tenant — a mesma contratação pode ter veredito diferente em outro tenant.",
            spacing: { after: 300 },
          }),

          new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Itens" }),
          ...(linhasItens.length
            ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({ children: [celula("Descrição", true), celula("Qtd.", true), celula("Valor unitário estimado", true)] }),
                    ...linhasItens,
                  ],
                }),
              ]
            : [new Paragraph({ text: "Nenhum item coletado para esta contratação." })]),

          new Paragraph({ heading: HeadingLevel.HEADING_2, text: "Achados", spacing: { before: 300 } }),
          ...secoesAchados,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const nomeArquivo = `dossie-${dossie.numeroControlePNCP.replace(/[^\w-]/g, "_")}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
