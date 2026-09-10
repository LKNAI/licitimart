import { SkeletonLinha, SkeletonPagina } from "@/components/Skeleton";

export default function Carregando() {
  return (
    <SkeletonPagina>
      <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-paper p-5">
            <SkeletonLinha className="w-24" />
            <SkeletonLinha className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>
    </SkeletonPagina>
  );
}
