"""Extracao nativa de texto (RF-002) -- so PDF/DOCX nato-digital. Nenhuma
chamada de OCR paga aqui; PDF escaneado sem camada de texto vira
"requer_ocr" explicito (RF-020), nunca escondido nem inventado. Motor de
OCR (Document AI/Textract) fica para quando houver decisao/orcamento --
ver src/licitimart/ocr/README.md.
"""
import io
import logging

from docx import Document
from pypdf import PdfReader

logger = logging.getLogger(__name__)

# Media de caracteres por pagina abaixo disso = sinal classico de PDF
# escaneado sem camada de texto (uma pagina de edital real tem
# tipicamente centenas a milhares de caracteres). Numero conservador --
# prefere marcar "requer_ocr" a mais do que menos, RNF-012.
LIMIAR_CHARS_POR_PAGINA = 40


def extrair_texto_pdf(conteudo: bytes) -> tuple[str, str, int, list[int]]:
    """Retorna (texto, status, paginas, offsets_paginas). status in
    ('extraido_nativo', 'requer_ocr', 'erro'). offsets_paginas[i] e o
    indice (em caracteres) onde a pagina i comeca dentro de `texto` --
    usado para localizar a pagina de um trecho encontrado (RF-006, Fase
    M), sem guardar o texto de cada pagina separado."""
    try:
        leitor = PdfReader(io.BytesIO(conteudo))
        paginas = len(leitor.pages)
        textos = [p.extract_text() or "" for p in leitor.pages]
    except Exception as exc:
        logger.warning("erro extraindo PDF: %s", exc)
        return "", "erro", 0, []

    offsets = []
    cursor = 0
    for t in textos:
        offsets.append(cursor)
        cursor += len(t) + 1  # +1 pelo "\n" do join abaixo
    texto = "\n".join(textos)

    media_por_pagina = len(texto) / paginas if paginas else 0
    if media_por_pagina < LIMIAR_CHARS_POR_PAGINA:
        return texto, "requer_ocr", paginas, offsets
    return texto, "extraido_nativo", paginas, offsets


def extrair_texto_docx(conteudo: bytes) -> tuple[str, str, int, list[int]]:
    """DOCX nao tem conceito de "pagina" no arquivo em si -- paginas e
    offsets_paginas voltam vazios (nao aplicavel, nunca fingido). status
    "requer_ocr" nao existe para DOCX (nao ha DOCX escaneado); só
    "extraido_nativo" ou "erro"."""
    try:
        documento = Document(io.BytesIO(conteudo))
        texto = "\n".join(p.text for p in documento.paragraphs)
    except Exception as exc:
        logger.warning("erro extraindo DOCX: %s", exc)
        return "", "erro", 0, []
    return texto, "extraido_nativo", 0, []


def extrair_texto(conteudo: bytes, titulo: str) -> tuple[str, str, int, list[int]]:
    """Despacha pelo conteudo real (magic bytes), nao pelo nome do
    arquivo -- achado real (Fase K, 10/09/2026): o campo "titulo" que o
    PNCP retorna nem sempre tem extensao (ex.: "EDITAL", sem ".pdf"),
    mesmo quando o arquivo E um PDF de verdade. Confiar só na extensao do
    nome gerava "erro" falso para documento perfeitamente extraivel."""
    if conteudo[:4] == b"%PDF":
        return extrair_texto_pdf(conteudo)
    if conteudo[:4] == b"PK\x03\x04":
        # docx e um zip -- tenta abrir como docx; se nao for (zip
        # generico, ex. anexo .zip de verdade), extrair_texto_docx
        # levanta e retorna "erro" honesto, nao finge sucesso.
        return extrair_texto_docx(conteudo)
    logger.info("formato nao suportado para extracao nativa (titulo=%r, primeiros bytes=%r)", titulo, conteudo[:8])
    return "", "erro", 0, []
