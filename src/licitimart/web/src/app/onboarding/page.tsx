"use client";

import { useActionState } from "react";
import { criarEmpresa } from "./actions";
import { campoClasse, botaoPrimarioClasse } from "@/components/ui";

const estadoInicial = { erro: "" };

export default function OnboardingPage() {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await criarEmpresa(formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Crie sua empresa</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        Este é o primeiro tenant — você vira administrador dele automaticamente e pode convidar o
        resto da equipe depois.
      </p>

      <form action={acao} className="mt-8 space-y-3 rounded-[6px] border border-line bg-surface p-6">
        <input name="nome" required placeholder="Nome da empresa" className={campoClasse} />
        <p role="status" aria-live="polite" className="text-[13px] text-seal-red">
          {estado.erro}
        </p>
        <button type="submit" disabled={pendente} className={`flex items-center justify-center gap-2 ${botaoPrimarioClasse}`}>
          {pendente && <span className="spinner" aria-hidden />}
          {pendente ? "Criando…" : "Criar e continuar"}
        </button>
      </form>
    </div>
  );
}
