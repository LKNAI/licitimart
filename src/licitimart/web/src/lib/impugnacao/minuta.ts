// Fase Q: porta de spikes/03_impugnacao_assistida/minuta.py -- gerador
// de minuta por TEMPLATE, não LLM. A fundamentação de cada achado
// (detector.ts) já é texto fixo; montar o documento não exige geração
// de linguagem nenhuma, só preenchimento de campos -- elimina risco de
// alucinação nessa etapa por completo. RN-006: o aviso é fixo no topo e
// no rodapé, sem parâmetro para remover.
import type { Achado } from "./detector";

export const AVISO_RN006 =
  "⚠️ RASCUNHO GERADO AUTOMATICAMENTE — NÃO SUBSTITUI ANÁLISE DE ADVOGADO HABILITADO. " +
  "Este documento não é protocolado automaticamente em nome de ninguém. O ato de revisar, " +
  "editar e protocolar é sempre humano e deliberado (RN-006).";

export interface ContextoEdital {
  numeroControlePncp: string;
  orgao: string;
  objeto: string;
}

export function gerarMinuta(contexto: ContextoEdital, achados: Achado[]): string {
  if (achados.length === 0) {
    throw new Error("gerarMinuta exige ao menos um achado -- não existe minuta vazia.");
  }

  const hoje = new Date().toLocaleDateString("pt-BR");
  const linhas = [
    AVISO_RN006,
    "",
    "# Minuta de Impugnação ao Edital",
    "",
    `**Processo/Edital (nº controle PNCP):** ${contexto.numeroControlePncp}  `,
    `**Órgão:** ${contexto.orgao}  `,
    `**Objeto:** ${contexto.objeto}  `,
    `**Data do rascunho:** ${hoje}`,
    "",
    "## Fundamentação",
    "",
    "A licitante que subscreve, tempestivamente, vem impugnar cláusula(s) do edital em " +
      "epígrafe, pelos fundamentos a seguir.",
    "",
  ];

  achados.forEach((achado, i) => {
    linhas.push(
      `### ${i + 1}. ${achado.explicacao}`,
      "",
      `**Trecho impugnado:** "${achado.trecho}"`,
      "",
      `**Fundamentação candidata:** ${achado.fundamentacaoCandidata}`,
      "",
      `> ${achado.aviso}`,
      ""
    );
  });

  linhas.push(
    "## Pedido",
    "",
    "Ante o exposto, requer-se a Vossa Senhoria:",
    "",
    "a) o conhecimento e provimento da presente impugnação;",
    "b) a revisão e, se confirmada a restritividade indevida, a exclusão ou adequação " +
      "da(s) cláusula(s) apontada(s), com nova publicação do edital corrigido e, se " +
      "necessário, reabertura do prazo de propostas;",
    "c) subsidiariamente, a manifestação fundamentada sobre cada ponto levantado, caso " +
      "o órgão entenda pela manutenção das exigências.",
    "",
    "Termos em que pede deferimento.",
    "",
    "---",
    "",
    AVISO_RN006
  );

  return linhas.join("\n");
}
