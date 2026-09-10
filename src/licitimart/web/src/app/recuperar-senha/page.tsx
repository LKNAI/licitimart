"use client";

import { useActionState } from "react";
import Link from "next/link";
import { pedirRecuperacao } from "./actions";

const estadoInicial = { erro: "", enviado: false };

export default function RecuperarSenhaPage() {
  const [estado, acao, pendente] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => {
      const resultado = await pedirRecuperacao(formData);
      return { erro: resultado?.erro ?? "", enviado: !!resultado?.enviado };
    },
    estadoInicial
  );

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Informe o e-mail da conta. Se existir, enviaremos um link para definir uma nova senha.
      </p>

      {estado.enviado ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Se o e-mail existir, o link de recuperação foi enviado.
        </div>
      ) : (
        <form action={acao} className="mt-6 space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <input name="email" type="email" required placeholder="e-mail" className="w-full rounded-md border border-neutral-300 p-2 text-sm" />
          {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
          <button
            type="submit"
            disabled={pendente}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pendente ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}

      <Link href="/login" className="mt-4 text-center text-sm text-neutral-500 hover:text-neutral-900">
        Voltar para o login
      </Link>
    </div>
  );
}
