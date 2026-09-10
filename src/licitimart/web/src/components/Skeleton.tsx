// Blocos de carregamento reaproveitados pelos loading.tsx de cada rota —
// mesma métrica visual (altura, espaçamento) da tela real, pra não haver
// salto de layout quando o dado chega.
export function SkeletonLinha({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonTabela({ linhas = 6 }: { linhas?: number }) {
  return (
    <div className="mt-8 divide-y divide-line border-y border-line">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          <SkeletonLinha className="w-1/3" />
          <SkeletonLinha className="w-1/6" />
          <SkeletonLinha className="ml-auto w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPagina({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <SkeletonLinha className="h-8! w-64" />
      <SkeletonLinha className="mt-3 w-full max-w-2xl" />
      {children ?? <SkeletonTabela />}
    </div>
  );
}
