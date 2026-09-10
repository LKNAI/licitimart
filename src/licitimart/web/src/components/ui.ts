// Classes Tailwind compartilhadas entre as telas de autenticação e
// formulários curtos -- evita que cada tela reinvente o mesmo input/botão
// com um pixel de diferença.
export const campoClasse =
  "w-full rounded-[4px] border border-line-strong bg-surface-raised px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-seal-blue";

export const botaoPrimarioClasse =
  "w-full rounded-[4px] bg-ink px-4 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-seal-green disabled:opacity-50";

export const botaoSecundarioClasse =
  "w-full rounded-[4px] border border-line-strong bg-transparent px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-raised disabled:opacity-50";
