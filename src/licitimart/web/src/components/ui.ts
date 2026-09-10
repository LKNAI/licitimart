// Classes Tailwind compartilhadas entre as telas de autenticação e
// formulários curtos -- evita que cada tela reinvente o mesmo input/botão
// com um pixel de diferença.
export const campoClasse =
  "w-full rounded-[4px] border border-line-strong bg-surface-raised px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-seal-blue";

export const botaoPrimarioClasse =
  "w-full rounded-[4px] bg-ink px-4 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-seal-green disabled:pointer-events-none disabled:opacity-50";

export const botaoSecundarioClasse =
  "w-full rounded-[4px] border border-line-strong bg-transparent px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-raised disabled:pointer-events-none disabled:opacity-50";

// Spinner + rótulo — usar dentro de um botão em estado pendente, em vez de
// só trocar o texto (feedback tem que ter presença visual, não só léxica).
export const spinnerClasse = "spinner";

// Caixa de estado vazio/"ainda não aconteceu" — mesmo tom em toda tela que
// precisar dizer "sem dado ainda" em vez de renderizar uma lista em branco.
export const estadoVazioClasse =
  "border border-dashed border-line-strong bg-surface p-6 text-[13.5px] italic leading-relaxed text-ink-faint";
