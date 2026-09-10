import Link from "next/link";
import { SeloCarimbo, SeloCompacto } from "@/components/Selo";

// Ícones desenhados à mão, mesmo peso de traço (1.4) e vocabulário de
// linha do resto do produto -- nunca um kit de ícone genérico importado.
// Cada um escolhido pela metáfora mais direta possível com a palavra ao
// lado (coleta = bandeja recebendo; triagem = funil; decisão = alternância
// binária) em vez de um símbolo abstrato que exige explicação.
const IconeColeta = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3.5v10.5" />
    <path d="M8 10.5l4 4 4-4" />
    <path d="M4 15v3.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V15" />
  </svg>
);

const IconeFunil = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5.5h16" />
    <path d="M4 5.5l6.5 7.5v6.3l3 1.4v-7.7l6.5-7.5" />
  </svg>
);

const IconeLupaDocumento = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 3h8l3.5 3.5V13" />
    <path d="M6.5 3v18h5.5" />
    <path d="M9 8h6M9 11.5h3.5" />
    <circle cx="16.3" cy="16.3" r="3.1" />
    <path d="M18.5 18.5 21 21" />
  </svg>
);

const IconeAlternancia = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="8" rx="4" />
    <circle cx="15" cy="12" r="2.6" fill="currentColor" stroke="none" />
  </svg>
);

const PASSOS = [
  {
    icone: IconeColeta,
    titulo: "Ingestão contínua do PNCP",
    texto:
      "Coleta cumulativa por data de publicação — nunca um retrato do dia que perde contratação por instabilidade momentânea da fonte. Cada lote carrega um manifesto versionado: consulta, contagem, hash do payload.",
  },
  {
    icone: IconeFunil,
    titulo: "Triagem e pontuação",
    texto:
      "Objeto, valor estimado, modalidade e item a item comparados contra o catálogo do seu tenant — com busca híbrida (texto + semântica), não só palavra-chave exata.",
  },
  {
    icone: IconeLupaDocumento,
    titulo: "Análise técnica e jurídica",
    texto:
      "Habilitação, exigências editalícias e cláusulas restritivas — cada afirmação amarrada a uma citação validada por substring literal contra o PDF/DOCX de origem, nunca parafraseada sem prova.",
  },
  {
    icone: IconeAlternancia,
    titulo: "Decidir se vale disputar",
    texto:
      "Três resultados possíveis: disputar, não disputar, ou pedir revisão humana quando falta base para concluir — no produto, esses três vereditos aparecem como Go, No-Go e Revisão Humana.",
  },
];

const DIFERENCIAIS = [
  {
    tom: "amber" as const,
    titulo: "Impugnação Assistida",
    texto:
      "Detecta cláusula potencialmente restritiva no edital e já gera a minuta de contestação. Sempre um rascunho — pendente de revisão jurídica humana antes de qualquer protocolo.",
  },
  {
    tom: "blue" as const,
    titulo: "Diff de Retificação",
    texto:
      "Toda retificação de edital vira um evento de primeira classe: o que mudou, campo a campo, com alerta — não um novo registro solto para você comparar manualmente.",
  },
  {
    tom: "green" as const,
    titulo: "Citação validada",
    texto:
      "Nenhuma recomendação chega à tela sem que o trecho citado seja conferido literalmente contra o texto do documento — e você pode clicar e ver a página exata de onde ela veio.",
  },
  {
    tom: "neutral" as const,
    titulo: "Selo de Confiabilidade",
    texto:
      "Três estados visíveis em cada contratação: confirmado (fontes concordam), fonte única, divergente. Divergência é mostrada, nunca escondida atrás de uma nota bonita.",
  },
];

const PRINCIPIOS_PRECO = [
  {
    titulo: "Atrelado ao uso real",
    texto:
      "Cada dossiê passa por agentes de IA lendo e validando documento por documento — o custo varia com volume de edital processado, não com um número fixo de assentos.",
  },
  {
    titulo: "Sem letra miúda depois",
    texto:
      "Antes de qualquer cobrança, você vê a estimativa daquele volume — nunca uma fatura surpresa por ter processado mais editais que o esperado.",
  },
  {
    titulo: "Calibrado com os primeiros clientes",
    texto:
      "Preferimos fechar o número certo depois de medir custo real contra edital real do que publicar uma tabela genérica e corrigir depois em produção.",
  },
];

const FAQ = [
  {
    pergunta: "O que é o PNCP e por que ele é a fonte primária?",
    resposta:
      "O Portal Nacional de Contratações Públicas (Lei 14.133/2021) é o repositório oficial de licitações do governo federal, estados e municípios. Ele é a fonte de verdade de cobertura do Licitimart na v1 — outras fontes (como o Comprasnet) só reconciliam informação, nunca preenchem uma lacuna de forma silenciosa.",
  },
  {
    pergunta: "Como a recomendação de disputar ou não pode ser confiável, vindo de IA?",
    resposta:
      "Nenhum agente recomenda disputar ou não sem citação validada por substring literal — o texto exibido é conferido palavra por palavra contra o documento de origem antes de chegar à tela. Quando não há base suficiente, o sistema responde \"Revisão Humana\" ou \"dado insuficiente\", nunca um requisito marcado como não cumprido sem prova. No produto, esses três resultados aparecem com os nomes técnicos Go, No-Go e Revisão Humana.",
  },
  {
    pergunta: "A Impugnação Assistida protocola a contestação por mim?",
    resposta:
      "Não. Ela gera uma minuta a partir da cláusula restritiva identificada, mas o protocolo é sempre uma decisão e uma ação humana — a minuta é rascunho pendente de revisão jurídica, nunca enviada automaticamente.",
  },
  {
    pergunta: "O que acontece quando um edital que eu já avaliei é retificado?",
    resposta:
      "A retificação é detectada campo a campo antes de sobrescrever o registro anterior. Você recebe o diff exato — o que mudou — em vez de precisar comparar duas versões do documento manualmente.",
  },
  {
    pergunta: "Preciso ser uma empresa já habituada a licitação para usar?",
    resposta:
      "Não. Quem está começando ganha a triagem e a recomendação de disputar ou não feita por você; quem já participa de licitações ganha velocidade sobre retificação e um argumento pronto para impugnar cláusula restritiva.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">
              Inteligência de licitações públicas
            </p>
            <h1 className="text-balance mt-4 max-w-[16ch] font-display text-4xl font-semibold leading-[1.08] text-ink sm:text-5xl">
              Decida disputar — com prova, não com opinião.
            </h1>
            <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-ink-soft">
              O Licitimart cruza cada edital publicado no PNCP com o catálogo da sua empresa,
              valida cada citação letra por letra contra o documento de origem e te diz se vale
              disputar, se não vale, ou se falta base para decidir — sem nota inventada para
              parecer completa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?cadastro=1"
                className="rounded-[4px] bg-ink px-5 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-seal-green"
              >
                Criar conta
              </Link>
              <Link
                href="/login"
                className="rounded-[4px] border border-line-strong px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-raised"
              >
                Entrar
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-5 border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
            <SeloCarimbo tom="green" titulo="Confirmado" subtitulo="fontes concordam" />
            <p className="max-w-[30ch] text-[13.5px] leading-relaxed text-ink-faint">
              Todo dado exibido carrega um selo de procedência — real do PNCP ou ilustrativo,
              sempre rotulado, nunca misturado silenciosamente.
            </p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Como funciona</p>
        <h2 className="text-balance mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
          Do edital publicado à decisão de disputar
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((p) => (
            <div key={p.titulo} className="border-t-2 border-ink pt-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink">
                  <span className="h-[18px] w-[18px]">
                    <p.icone />
                  </span>
                </span>
                <h3 className="font-display text-[17px] font-semibold leading-tight text-ink">{p.titulo}</h3>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Diferenciais */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Diferenciais</p>
          <h2 className="text-balance mt-2 max-w-[42ch] font-display text-2xl font-semibold text-ink sm:text-3xl">
            O que nenhum radar de licitação genérico faz
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {DIFERENCIAIS.map((d) => (
              <div
                key={d.titulo}
                className="rounded-[6px] border border-line bg-surface-raised p-6"
              >
                <SeloCompacto tom={d.tom}>{d.titulo}</SeloCompacto>
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{d.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perfis de usuário */}
      <section className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Para quem</p>
        <h2 className="text-balance mt-2 max-w-[42ch] font-display text-2xl font-semibold text-ink sm:text-3xl">
          Uma tela para cada responsabilidade
        </h2>
        <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-l-2 border-line-strong pl-4">
            <dt className="font-display text-[15px] font-semibold text-ink">Analista de Licitação</dt>
            <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
              Conferência operacional e técnica — dossiês, checklist, revisão do que ficou em
              Revisão Humana.
            </dd>
          </div>
          <div className="border-l-2 border-line-strong pl-4">
            <dt className="font-display text-[15px] font-semibold text-ink">Gestor Comercial</dt>
            <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
              Pipeline, volume e prazo — acompanha score e metas em um só painel.
            </dd>
          </div>
          <div className="border-l-2 border-line-strong pl-4">
            <dt className="font-display text-[15px] font-semibold text-ink">Jurídico / Compliance</dt>
            <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
              Revisa e edita as minutas de impugnação antes do protocolo; arquiva dossiês
              encerrados.
            </dd>
          </div>
          <div className="border-l-2 border-line-strong pl-4">
            <dt className="font-display text-[15px] font-semibold text-ink">Administrador da Conta</dt>
            <dd className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
              Catálogo, membros do time e teto de uso — a conformidade do tenant.
            </dd>
          </div>
        </dl>
      </section>

      {/* Preço */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Preço</p>
              <h2 className="text-balance mt-2 max-w-[24ch] font-display text-2xl font-semibold text-ink sm:text-3xl">
                Comece pequeno, cresça com o pipeline
              </h2>
              <p className="mt-4 max-w-[42ch] text-[13.5px] leading-relaxed text-ink-soft">
                Não publicamos uma tabela de planos fechada porque ainda não seria honesta: boa
                parte do custo do Licitimart vem de IA lendo documento por documento, e esse
                número só fica confiável depois de medido contra volume real — não antes.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <SeloCarimbo tom="amber" titulo="Em estudo" subtitulo="preço v1" />
                <p className="max-w-[26ch] text-[12.5px] leading-relaxed text-ink-faint">
                  Rótulo honesto agora vale mais do que tabela de preço inventada cedo demais.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {PRINCIPIOS_PRECO.map((p) => (
                <div key={p.titulo} className="rounded-[6px] border border-line bg-surface-raised p-5">
                  <h3 className="font-display text-[15px] font-semibold text-ink">{p.titulo}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[52ch] text-[13.5px] leading-relaxed text-ink-soft">
              Crie sua conta agora e entre no grupo que ajuda a calibrar o preço junto com a gente
              — sem compromisso de cobrança até o modelo estar fechado.
            </p>
            <Link
              href="/login?cadastro=1"
              className="shrink-0 rounded-[4px] bg-ink px-5 py-2.5 text-[14px] font-medium text-paper transition-colors hover:bg-seal-green"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-faint">Perguntas frequentes</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
          Antes de criar sua conta
        </h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.pergunta} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[15px] font-medium text-ink">
                {f.pergunta}
                <span aria-hidden className="text-ink-faint transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-soft">
                {f.resposta}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-line bg-ink">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between lg:py-14">
          <div>
            <h2 className="text-balance max-w-[30ch] font-display text-2xl font-semibold text-paper sm:text-3xl">
              Pare de decidir no palpite se vale disputar.
            </h2>
            <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-paper/70">
              Crie sua conta e conecte o catálogo da sua empresa ao PNCP em minutos.
            </p>
          </div>
          <Link
            href="/login?cadastro=1"
            className="shrink-0 rounded-[4px] bg-paper px-6 py-3 text-[14px] font-medium text-ink transition-colors hover:bg-seal-green-bg"
          >
            Criar conta
          </Link>
        </div>
      </section>
    </>
  );
}
