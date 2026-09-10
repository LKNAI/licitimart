"use client";

// Boundary de erro de rota — sem isso, uma exceção não tratada (ex.: falha
// de rede no Supabase) derruba a tela inteira em branco, sem explicação
// nem saída.
export default function ErroRota({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <p className="font-mono text-[12px] uppercase tracking-wide text-seal-red">Erro</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Não foi possível carregar esta tela</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        Pode ser uma instabilidade momentânea na conexão com o Supabase ou com o PNCP. Tentar de
        novo costuma resolver — se persistir, é um problema real, não um refresh que vai consertar
        sozinho.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-[4px] border border-line-strong bg-transparent px-6 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-raised"
      >
        Tentar de novo
      </button>
    </div>
  );
}
