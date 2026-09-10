import { SkeletonLinha, SkeletonPagina } from "@/components/Skeleton";

export default function Carregando() {
  return (
    <SkeletonPagina>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-t-2 border-line pt-3">
            <SkeletonLinha className="w-32" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <SkeletonLinha key={j} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonPagina>
  );
}
