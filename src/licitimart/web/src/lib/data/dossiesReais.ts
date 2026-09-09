// Dado REAL do PNCP -- gerado por scripts/exportar_para_webapp.py, que roda
// o conector de producao (src/licitimart/ingestao/pncp.py) contra o PNCP
// real e exporta um snapshot. Nenhum item aqui recebe veredito Go/No-Go
// nem achado nenhum -- isso exigiria os agentes AG-01 a AG-05 (LLM, sem
// chave neste ambiente). Todo item real entra como "revisao_humana" +
// "fonte_unica" porque e exatamente isso que e verdade hoje: dado
// ingerido, zero analise feita (RNF-012 -- nunca fingir score sobre base
// nao avaliada).
//
// O snapshot NAO e versionado no git (e dado reproduzivel pelo script,
// mesma regra do resto do projeto para data/**) -- por isso e lido em
// runtime via fs, nao por "import" estatico: um `git clone` sem nunca ter
// rodado o script precisa continuar buildando, so com a lista real vazia
// e um aviso, nunca um erro de build.
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Dossie } from "@/lib/mock/dossies";

const CAMINHO_SNAPSHOT = path.join(process.cwd(), "src", "lib", "data", "contratacoes_pncp.json");

interface ItemExportado {
  numeroControlePNCP: string | null;
  orgao: string | null;
  municipioUf: string;
  objeto: string | null;
  modalidade: string | null;
  valorEstimado: number | null;
  dataPublicacao: string | null;
}

interface Snapshot {
  coletadoEm: string;
  fonte: string;
  janela: { dataInicial: string; dataFinal: string };
  modalidadesConsultadas: number[];
  pendenciasNaoResolvidas: number;
  throttleNivelSeguro: number;
  throttleErrosTaxa: number;
  throttleErrosRede: number;
  itens: ItemExportado[];
}

export interface MetadadoSnapshot {
  disponivel: boolean;
  coletadoEm: string | null;
  janela: { dataInicial: string; dataFinal: string } | null;
  totalItens: number;
  pendenciasNaoResolvidas: number;
}

async function carregarSnapshot(): Promise<Snapshot | null> {
  try {
    const conteudo = await readFile(CAMINHO_SNAPSHOT, "utf-8");
    return JSON.parse(conteudo) as Snapshot;
  } catch {
    return null; // arquivo nao existe -- ninguem rodou o script ainda, e tudo bem
  }
}

export async function carregarDossiesReais(): Promise<{ dossies: Dossie[]; metadado: MetadadoSnapshot }> {
  const snapshot = await carregarSnapshot();

  if (!snapshot) {
    return {
      dossies: [],
      metadado: { disponivel: false, coletadoEm: null, janela: null, totalItens: 0, pendenciasNaoResolvidas: 0 },
    };
  }

  const dossies: Dossie[] = snapshot.itens
    .filter((item) => item.numeroControlePNCP)
    .map((item, i) => ({
      // numeroControlePNCP contem "/" (ex.: ...-000967/2026) -- sanitizar
      // para nao virar dois segmentos na rota dinamica /dossies/[id].
      id: `real-${i}-${item.numeroControlePNCP!.replace(/\//g, "-")}`,
      numeroControlePNCP: item.numeroControlePNCP!,
      orgao: `${item.orgao ?? "Órgão não informado"} — ${item.municipioUf}`,
      objeto: item.objeto ?? "(objeto não informado)",
      modalidade: item.modalidade ?? "(modalidade não informada)",
      valorEstimado: item.valorEstimado ?? 0,
      dataPublicacao: item.dataPublicacao ?? snapshot.janela.dataInicial,
      veredito: "revisao_humana" as const,
      confiabilidade: "fonte_unica" as const,
      itens: [],
      achados: [],
      origem: "pncp_real" as const,
    }));

  return {
    dossies,
    metadado: {
      disponivel: true,
      coletadoEm: snapshot.coletadoEm,
      janela: snapshot.janela,
      totalItens: dossies.length,
      pendenciasNaoResolvidas: snapshot.pendenciasNaoResolvidas,
    },
  };
}
