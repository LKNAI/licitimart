// Vocabulário visual único para todo estado de procedência/confiança do
// produto (Selo de Confiabilidade, Veredito, Origem do dado, status de
// extração) -- em vez de um pill colorido genérico por tela, um único
// objeto reaparece com significado consistente: tom = confiança.
export type Tom = "green" | "amber" | "red" | "blue" | "neutral";

const TOM_COMPACTO: Record<Tom, string> = {
  green: "border-seal-green bg-seal-green-bg text-seal-green",
  amber: "border-seal-amber bg-seal-amber-bg text-seal-amber",
  red: "border-seal-red bg-seal-red-bg text-seal-red",
  blue: "border-seal-blue bg-seal-blue-bg text-seal-blue",
  neutral: "border-line bg-surface text-ink-soft",
};

// Tag com entalhe à esquerda -- deliberadamente não é o pill
// arredondado-igual-em-tudo do kit SaaS genérico.
export function SeloCompacto({ tom, children }: { tom: Tom; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] border-l-[3px] px-2 py-1 text-xs font-medium leading-none ${TOM_COMPACTO[tom]}`}
    >
      {children}
    </span>
  );
}

const TOM_CARIMBO: Record<Tom, string> = {
  green: "border-seal-green text-seal-green",
  amber: "border-seal-amber text-seal-amber",
  red: "border-seal-red text-seal-red",
  blue: "border-seal-blue text-seal-blue",
  neutral: "border-line-strong text-ink-soft",
};

// O "carimbo" -- selo circular de anel duplo, levemente rotacionado,
// reservado para o momento de maior peso de cada tela (Selo de
// Confiabilidade no dossiê). Mesmo objeto visual, plantado uma vez por
// tela, nunca repetido em série (isso é o que mantém "um selo, um
// significado" em vez de virar decoração).
export function SeloCarimbo({
  tom,
  titulo,
  subtitulo,
  className = "",
}: {
  tom: Tom;
  titulo: string;
  subtitulo?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex h-[6.5rem] w-[6.5rem] shrink-0 -rotate-3 flex-col items-center justify-center gap-0.5 rounded-full border-[5px] border-double p-2 text-center ${TOM_CARIMBO[tom]} ${className}`}
      style={{ boxShadow: `0 0 0 3px var(--color-surface), 0 0 0 4px currentColor` }}
    >
      <span className="font-display text-[13px] leading-tight">{titulo}</span>
      {subtitulo && <span className="text-[9px] leading-tight text-ink-soft">{subtitulo}</span>}
    </div>
  );
}
