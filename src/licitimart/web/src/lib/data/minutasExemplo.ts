// Exemplos de minuta de Impugnação Assistida (RF-017), gerados por
// scripts/exportar_minutas_exemplo.py a partir do gerador REAL e
// determinístico do spike 03 (spikes/03_impugnacao_assistida/minuta.py --
// sem LLM). Mesmo padrão de leitura em runtime da Fase A: sem o arquivo,
// cai num estado vazio explícito, nunca quebra o build.
import { readFile } from "node:fs/promises";
import path from "node:path";

const CAMINHO = path.join(process.cwd(), "src", "lib", "data", "minutas_exemplo.json");

export interface Achado {
  padrao: string;
  trecho: string;
  explicacao: string;
  fundamentacao_candidata: string;
  aviso: string;
}

export interface ExemploMinuta {
  contexto: { numero_controle_pncp: string; orgao: string; objeto: string };
  textoEditalSintetico: string;
  achados: Achado[];
  minutaMarkdown: string;
}

interface Payload {
  geradoEm: string;
  geradoPor: string;
  exemplos: ExemploMinuta[];
}

export async function carregarMinutasExemplo(): Promise<{ disponivel: boolean; payload: Payload | null }> {
  try {
    const conteudo = await readFile(CAMINHO, "utf-8");
    return { disponivel: true, payload: JSON.parse(conteudo) as Payload };
  } catch {
    return { disponivel: false, payload: null };
  }
}
