"use client";

import { useActionState } from "react";
import { criarEmpresa } from "./actions";

const estadoInicial = { erro: "" };

export default function OnboardingPage() {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await criarEmpresa(formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Crie sua empresa</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-004 — primeiro tenant. Você vira administrador dele automaticamente.
      </p>

      <form action={acao} className="mt-6 space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
        <input
          name="nome"
          required
          placeholder="Nome da empresa"
          className="w-full rounded-md border border-neutral-300 p-2 text-sm"
        />
        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pendente ? "Criando…" : "Criar e continuar"}
        </button>
      </form>
    </div>
  );
}
