import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Licitimart</h1>
      <p className="mt-3 text-neutral-600">
        Triagem, análise técnica/jurídica e recomendação Go/No-Go sobre contratações
        públicas — com citação rastreável até a página exata do documento, nunca uma
        nota sem prova.
      </p>

      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Este é o esqueleto da v1. Não há projeto Supabase configurado neste ambiente —
        todo dado exibido em <code>/dossies</code> e <code>/pipeline</code> é mock. Ver{" "}
        <code>plan.md</code> para o que falta.
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/dossies"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Ver dossiês (mock)
        </Link>
        <Link
          href="/pipeline"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
        >
          Ver pipeline Go/No-Go (mock)
        </Link>
      </div>
    </div>
  );
}
