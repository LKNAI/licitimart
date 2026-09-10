import Link from "next/link";
import { SeloCarimbo } from "@/components/Selo";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-semibold leading-tight text-ink">Licitimart</h1>
      <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">
        Triagem, análise técnica/jurídica e recomendação Go/No-Go sobre contratações públicas do
        PNCP — com citação rastreável até a página exata do documento, nunca uma nota sem prova.
      </p>

      <div className="mt-10 flex items-center gap-5 border-y border-line py-6">
        <SeloCarimbo tom="green" titulo="Confirmado" subtitulo="fontes concordam" />
        <p className="max-w-[42ch] text-[13.5px] leading-relaxed text-ink-faint">
          Todo dado exibido carrega um selo de procedência — real do PNCP ou ilustrativo, sempre
          rotulado, nunca misturado silenciosamente.
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/dossies"
          className="rounded-[4px] bg-ink px-4 py-2.5 text-[14px] font-medium text-paper hover:bg-seal-green"
        >
          Ver dossiês
        </Link>
        <Link
          href="/pipeline"
          className="rounded-[4px] border border-line-strong px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-surface"
        >
          Ver pipeline Go/No-Go
        </Link>
      </div>
    </div>
  );
}
