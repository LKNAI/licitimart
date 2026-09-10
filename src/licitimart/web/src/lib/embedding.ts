// RF-005 -- embute a busca do usuario em tempo real com o MESMO modelo
// usado em lote pelo lado Python (fastembed) para embutir
// contratacoes.objeto -- confirmado empiricamente que os dois runtimes
// (fastembed/ONNX em Python, @huggingface/transformers/ONNX em Node)
// produzem embedding identico para o mesmo texto (mean pooling,
// normalizado). Sem chave de API, roda local (ver plan_fase_j.md).
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODELO = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

// Singleton em nivel de modulo -- carregar o modelo (~220MB) a cada
// busca seria inviavel; carrega uma vez por processo do servidor e
// reusa.
let extratorPromise: Promise<FeatureExtractionPipeline> | null = null;

function obterExtrator() {
  if (!extratorPromise) {
    extratorPromise = pipeline("feature-extraction", MODELO) as Promise<FeatureExtractionPipeline>;
  }
  return extratorPromise;
}

export async function embutirTexto(texto: string): Promise<number[]> {
  const extrator = await obterExtrator();
  const saida = await extrator(texto, { pooling: "mean", normalize: true });
  return Array.from(saida.data as Float32Array);
}

// Formato de texto que pgvector aceita via RPC (ver migration Fase J --
// parametro p_embedding e text, castado para vector(384) dentro da
// funcao, nao vector direto -- e o padrao para supabase-js + pgvector).
export function formatarParaPgvector(vetor: number[]): string {
  return "[" + vetor.join(",") + "]";
}
