import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center">
      <p className="font-mono text-[12px] uppercase tracking-wide text-ink-faint">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Página não encontrada</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        O link pode estar quebrado ou o dossiê pode ter sido removido.
      </p>
      <Link
        href="/dossies"
        className="mt-6 inline-block rounded-[4px] border border-line-strong bg-transparent px-6 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-raised"
      >
        Voltar para Dossiês
      </Link>
    </div>
  );
}
