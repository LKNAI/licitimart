"use client";

import { useActionState } from "react";
import { redefinirSenha } from "./actions";

const estadoInicial = { erro: "" };

export default function RedefinirSenhaPage() {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await redefinirSenha(formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
      <p className="mt-1 text-sm text-neutral-500">Defina uma nova senha para sua conta.</p>

      <form action={acao} className="mt-6 space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
        <input
          name="senha"
          type="password"
          required
          minLength={6}
          placeholder="nova senha (mín. 6 caracteres)"
          className="w-full rounded-md border border-neutral-300 p-2 text-sm"
        />
        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
