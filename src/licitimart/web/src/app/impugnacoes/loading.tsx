import { SkeletonLinha, SkeletonPagina } from "@/components/Skeleton";

export default function Carregando() {
  return (
    <SkeletonPagina>
      <div className="mt-10 space-y-3">
        <SkeletonLinha className="h-24 w-full" />
        <SkeletonLinha className="h-24 w-full" />
      </div>
    </SkeletonPagina>
  );
}
