import { SkeletonLinha } from "@/components/Skeleton";

export default function Carregando() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando dossiê…</span>
      <SkeletonLinha className="w-24" />
      <SkeletonLinha className="mt-4 h-8 w-full max-w-xl" />
      <SkeletonLinha className="mt-2 w-56" />
      <div className="mt-8 flex items-center justify-between border-y border-line py-6">
        <SkeletonLinha className="h-9 w-64" />
        <div className="skeleton h-[6.5rem] w-[6.5rem] rounded-full" />
      </div>
      <SkeletonLinha className="mt-8 h-40 w-full" />
    </div>
  );
}
