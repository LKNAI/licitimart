"use client";

import { useActionState } from "react";
import Link from "next/link";
import { pedirRecuperacao } from "./actions";
import { campoClasse, botaoPrimarioClasse } from "@/components/ui";

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
    <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-3xl font-semibold text-ink">Recuperar senha</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        Informe o e-mail da conta. Se existir, enviaremos um link para definir uma nova senha.
      </p>

      {estado.enviado ? (
        <div className="mt-8 rounded-[6px] border border-seal-green bg-seal-green-bg px-4 py-3 text-[14px] text-seal-green">
          Se o e-mail existir, o link de recuperação foi enviado.
        </div>
      ) : (
        <form action={acao} className="mt-8 space-y-3 rounded-[6px] border border-line bg-surface p-6">
          <input name="email" type="email" required placeholder="e-mail" className={campoClasse} />
          {estado.erro && <p className="text-[13px] text-seal-red">{estado.erro}</p>}
          <button type="submit" disabled={pendente} className={botaoPrimarioClasse}>
            {pendente ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}

      <Link href="/login" className="mt-5 text-center text-[13px] text-ink-soft hover:text-ink">
        Voltar para o login
      </Link>
    </div>
  );
}
