// Fase N: extração nativa de PDF/DOCX equivalente a
// src/licitimart/ingestao/extracao.py, portada para Node -- mesma regra:
// PDF escaneado sem camada de texto vira "requer_ocr" explícito, nunca
// inventado. Nenhuma chamada de OCR paga aqui.
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// Media de caracteres por pagina abaixo disso = sinal classico de PDF
// escaneado sem camada de texto -- mesmo limiar de extracao.py
// (LIMIAR_CHARS_POR_PAGINA), para os dois runtimes concordarem sobre o
// mesmo documento.
const LIMIAR_CHARS_POR_PAGINA = 40;

export interface ResultadoExtracao {
  texto: string;
  status: "extraido_nativo" | "requer_ocr" | "erro";
  paginas: number;
  offsets: number[];
}

async function extrairTextoPdf(conteudo: Buffer): Promise<ResultadoExtracao> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: conteudo });
    const resultado = await parser.getText();
    const textos = resultado.pages.map((p) => p.text ?? "");
    const paginas = resultado.total;

    // Mesmo calculo de offsets de extracao.py: offsets[i] e o indice (em
    // caracteres) onde a pagina i comeca dentro de `texto`.
    const offsets: number[] = [];
    let cursor = 0;
    for (const t of textos) {
      offsets.push(cursor);
      cursor += t.length + 1; // +1 pelo "\n" do join abaixo
    }
    const texto = textos.join("\n");

    const mediaPorPagina = paginas ? texto.length / paginas : 0;
    const status = mediaPorPagina < LIMIAR_CHARS_POR_PAGINA ? "requer_ocr" : "extraido_nativo";
    return { texto, status, paginas, offsets };
  } catch (exc) {
    console.warn("erro extraindo PDF:", exc);
    return { texto: "", status: "erro", paginas: 0, offsets: [] };
  } finally {
    await parser?.destroy();
  }
}

async function extrairTextoDocx(conteudo: Buffer): Promise<ResultadoExtracao> {
  // DOCX nao tem conceito de "pagina" no arquivo em si -- paginas e
  // offsets voltam vazios (nao aplicavel, nunca fingido), mesma
  // convencao do lado Python.
  try {
    const { value } = await mammoth.extractRawText({ buffer: conteudo });
    return { texto: value, status: "extraido_nativo", paginas: 0, offsets: [] };
  } catch {
    return { texto: "", status: "erro", paginas: 0, offsets: [] };
  }
}

// Despacha pelo conteudo real (magic bytes), nao pelo nome do arquivo --
// mesmo achado da Fase K: o "titulo" do PNCP nem sempre tem extensao.
export async function extrairTexto(conteudo: ArrayBuffer): Promise<ResultadoExtracao> {
  const buffer = Buffer.from(conteudo);
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("latin1") === "%PDF") {
    return extrairTextoPdf(buffer);
  }
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return extrairTextoDocx(buffer);
  }
  return { texto: "", status: "erro", paginas: 0, offsets: [] };
}
