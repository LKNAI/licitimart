"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { entrar, cadastrar } from "./actions";
import { campoClasse, botaoPrimarioClasse } from "@/components/ui";
import { SeloCarimbo } from "@/components/Selo";

const estadoInicial = { erro: "" };

function CartaoAuth() {
  const searchParams = useSearchParams();
  const [aba, setAba] = useState<"entrar" | "cadastro">(
    searchParams.get("cadastro") ? "cadastro" : "entrar"
  );

  const [estadoEntrar, acaoEntrar, pendenteEntrar] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await entrar(formData)) ?? estadoInicial,
    estadoInicial
  );
  const [estadoCadastrar, acaoCadastrar, pendenteCadastrar] = useActionState(
    async (_: typeof estadoInicial, formData: FormData) => (await cadastrar(formData)) ?? estadoInicial,
    estadoInicial
  );

  return (
    <div className="cartao-flutuante w-full max-w-md rounded-[8px] border border-line bg-surface-raised p-7 shadow-[var(--sombra-flutuante)]">
      <div className="flex rounded-[5px] border border-line bg-paper p-1">
        <button
          type="button"
          onClick={() => setAba("entrar")}
          aria-pressed={aba === "entrar"}
          className={`flex-1 rounded-[3px] py-2 text-[13.5px] font-medium transition-colors ${
            aba === "entrar" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setAba("cadastro")}
          aria-pressed={aba === "cadastro"}
          className={`flex-1 rounded-[3px] py-2 text-[13.5px] font-medium transition-colors ${
            aba === "cadastro" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
          }`}
        >
          Criar conta
        </button>
      </div>

      {aba === "entrar" ? (
        <form action={acaoEntrar} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="e-mail" className={campoClasse} autoFocus />
          <input name="senha" type="password" required placeholder="senha" className={campoClasse} />
          <p role="status" aria-live="polite" className="text-[13px] text-seal-red">
            {estadoEntrar.erro}
          </p>
          <button type="submit" disabled={pendenteEntrar} className={`flex items-center justify-center gap-2 ${botaoPrimarioClasse}`}>
            {pendenteEntrar && <span className="spinner" aria-hidden />}
            {pendenteEntrar ? "Entrando…" : "Entrar"}
          </button>
          <Link href="/recuperar-senha" className="block text-center text-[13px] text-ink-soft transition-colors hover:text-ink">
            Esqueci minha senha
          </Link>
        </form>
      ) : (
        <form action={acaoCadastrar} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="e-mail" className={campoClasse} autoFocus />
          <input
            name="senha"
            type="password"
            required
            minLength={6}
            placeholder="senha (mín. 6 caracteres)"
            className={campoClasse}
          />
          <p role="status" aria-live="polite" className="text-[13px] text-seal-red">
            {estadoCadastrar.erro}
          </p>
          <button type="submit" disabled={pendenteCadastrar} className={`flex items-center justify-center gap-2 ${botaoPrimarioClasse}`}>
            {pendenteCadastrar && <span className="spinner" aria-hidden />}
            {pendenteCadastrar ? "Criando…" : "Criar conta"}
          </button>
          <p className="text-center text-[12px] leading-relaxed text-ink-faint">
            Ao criar conta você concorda em conectar o catálogo da sua empresa ao PNCP para
            triagem — sem cobrança até o modelo de preço estar fechado.
          </p>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center bg-surface px-6 py-14">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">
        Inteligência de licitações públicas
      </p>
      <h1 className="mt-3 max-w-[18ch] text-balance text-center font-display text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">
        Prova, não opinião.
      </h1>

      <div className="mt-8">
        <Suspense fallback={<div className="h-[356px] w-full max-w-md" />}>
          <CartaoAuth />
        </Suspense>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <SeloCarimbo tom="green" titulo="Confirmado" subtitulo="fontes concordam" />
        <p className="max-w-[30ch] text-[12.5px] leading-relaxed text-ink-faint">
          Cada contratação carrega um selo de procedência assim — visível em toda tela, nunca
          escondido atrás de um score.
        </p>
      </div>
    </div>
  );
}
