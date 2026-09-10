"use client";

import { useActionState } from "react";
import { redefinirSenha } from "./actions";
import { campoClasse, botaoPrimarioClasse } from "@/components/ui";

const estadoInicial = { erro: "" };

export default function RedefinirSenhaPage() {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await redefinirSenha(formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Nova senha</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">Defina uma nova senha para sua conta.</p>

      <form action={acao} className="mt-8 space-y-3 rounded-[6px] border border-line bg-surface p-6">
        <input
          name="senha"
          type="password"
          required
          minLength={6}
          placeholder="nova senha (mín. 6 caracteres)"
          className={campoClasse}
        />
        <p role="status" aria-live="polite" className="text-[13px] text-seal-red">
          {estado.erro}
        </p>
        <button type="submit" disabled={pendente} className={`flex items-center justify-center gap-2 ${botaoPrimarioClasse}`}>
          {pendente && <span className="spinner" aria-hidden />}
          {pendente ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
