-- Fase M: navegacao "clique e veja a pagina exata" (RF-006).
--
-- Guarda so o deslocamento (offset) de inicio de cada pagina dentro de
-- texto_extraido, nao o texto de cada pagina separado -- evita duplicar
-- conteudo ja salvo; dado o indice de um trecho encontrado, a pagina se
-- calcula por busca binaria sobre os offsets.

alter table public.documentos_contratacao add column paginas_offsets integer[];
