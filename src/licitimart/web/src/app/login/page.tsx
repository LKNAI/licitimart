"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrar, cadastrar } from "./actions";

const estadoInicial = { erro: "" };

export default function LoginPage() {
  const [estadoEntrar, acaoEntrar, pendenteEntrar] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await entrar(formData)) ?? estadoInicial,
    estadoInicial
  );
  const [estadoCadastrar, acaoCadastrar, pendenteCadastrar] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await cadastrar(formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Licitimart</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Fase D — login por e-mail/senha (Magic Link/OAuth ficam para depois, ver plan_fase_d.md).
      </p>

      <form action={acaoEntrar} className="mt-6 space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Entrar</h2>
        <input name="email" type="email" required placeholder="e-mail" className="w-full rounded-md border border-neutral-300 p-2 text-sm" />
        <input name="senha" type="password" required placeholder="senha" className="w-full rounded-md border border-neutral-300 p-2 text-sm" />
        {estadoEntrar.erro && <p className="text-sm text-red-600">{estadoEntrar.erro}</p>}
        <button
          type="submit"
          disabled={pendenteEntrar}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pendenteEntrar ? "Entrando…" : "Entrar"}
        </button>
        <Link href="/recuperar-senha" className="block text-center text-xs text-neutral-500 hover:text-neutral-900">
          Esqueci minha senha
        </Link>
      </form>

      <form action={acaoCadastrar} className="mt-4 space-y-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Ainda não tem conta? Cadastre-se</h2>
        <input name="email" type="email" required placeholder="e-mail" className="w-full rounded-md border border-neutral-300 p-2 text-sm" />
        <input name="senha" type="password" required minLength={6} placeholder="senha (mín. 6 caracteres)" className="w-full rounded-md border border-neutral-300 p-2 text-sm" />
        {estadoCadastrar.erro && <p className="text-sm text-red-600">{estadoCadastrar.erro}</p>}
        <button
          type="submit"
          disabled={pendenteCadastrar}
          className="w-full rounded-md border border-neutral-400 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-white disabled:opacity-50"
        >
          {pendenteCadastrar ? "Criando…" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
