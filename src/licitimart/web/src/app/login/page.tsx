"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrar, cadastrar } from "./actions";
import { campoClasse, botaoPrimarioClasse, botaoSecundarioClasse } from "@/components/ui";
import { SeloCarimbo } from "@/components/Selo";

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
    <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-16 px-6 py-10 lg:min-h-[calc(100vh-57px)] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-16">
      <div className="hidden lg:block">
        <p className="font-mono text-xs text-ink-faint">Inteligência de licitações públicas</p>
        <h1 className="mt-4 max-w-[13ch] font-display text-[52px] font-semibold leading-[1.05] text-ink">
          Prova, não opinião.
        </h1>
        <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-ink-soft">
          O Licitimart cruza cada edital publicado no PNCP com o catálogo do seu tenant. Toda
          citação exibida é conferida literalmente contra o texto de origem antes de chegar à
          tela — e quando o dado não é suficiente para uma conclusão, a tela diz isso, em vez de
          arredondar para uma nota bonita.
        </p>
        <div className="mt-10 flex items-center gap-5">
          <SeloCarimbo tom="green" titulo="Confirmado" subtitulo="fontes concordam" />
          <p className="max-w-[30ch] text-[13px] leading-relaxed text-ink-faint">
            Cada contratação carrega um selo de procedência assim — visível em toda tela, nunca
            escondido atrás de um score.
          </p>
        </div>
      </div>

      <div className="w-full">
        <h2 className="font-display text-2xl font-semibold text-ink lg:hidden">Licitimart</h2>

        <form
          action={acaoEntrar}
          className="mt-6 space-y-3 rounded-[6px] border border-line bg-surface p-6 lg:mt-0"
        >
          <h2 className="font-display text-lg font-semibold text-ink">Entrar</h2>
          <input name="email" type="email" required placeholder="e-mail" className={campoClasse} />
          <input name="senha" type="password" required placeholder="senha" className={campoClasse} />
          {estadoEntrar.erro && <p className="text-[13px] text-seal-red">{estadoEntrar.erro}</p>}
          <button type="submit" disabled={pendenteEntrar} className={botaoPrimarioClasse}>
            {pendenteEntrar ? "Entrando…" : "Entrar"}
          </button>
          <Link href="/recuperar-senha" className="block text-center text-[13px] text-ink-soft hover:text-ink">
            Esqueci minha senha
          </Link>
        </form>

        <form
          action={acaoCadastrar}
          className="mt-4 space-y-3 rounded-[6px] border border-dashed border-line-strong bg-transparent p-6"
        >
          <h2 className="font-display text-lg font-semibold text-ink">Ainda não tem conta?</h2>
          <input name="email" type="email" required placeholder="e-mail" className={campoClasse} />
          <input
            name="senha"
            type="password"
            required
            minLength={6}
            placeholder="senha (mín. 6 caracteres)"
            className={campoClasse}
          />
          {estadoCadastrar.erro && <p className="text-[13px] text-seal-red">{estadoCadastrar.erro}</p>}
          <button type="submit" disabled={pendenteCadastrar} className={botaoSecundarioClasse}>
            {pendenteCadastrar ? "Criando…" : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
