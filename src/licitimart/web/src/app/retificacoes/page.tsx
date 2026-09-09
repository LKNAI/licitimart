import { diffPalavras } from "@/lib/diffSimples";

// Exemplo estatico -- nao ha retificacao real rastreada ainda (isso exige
// o coletor comparar duas coletas da mesma numeroControlePNCP ao longo do
// tempo, trabalho de v2 do coletor, nao construido ainda). O diff em si e
// real (calculado, nao fingido), so o par de textos e ilustrativo.
const VERSAO_ORIGINAL =
  "O prazo de entrega dos equipamentos será de 30 (trinta) dias corridos, contados da " +
  "assinatura do contrato. Serão aceitos produtos de qualquer marca, desde que atendam " +
  "às especificações técnicas do item.";

const VERSAO_RETIFICADA =
  "O prazo de entrega dos equipamentos será de 5 (cinco) dias corridos, contados da " +
  "assinatura do contrato. Só serão aceitos produtos da marca Xylotech.";

export default function RetificacoesPage() {
  const diff = diffPalavras(VERSAO_ORIGINAL, VERSAO_RETIFICADA);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Diff de Retificação</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-018 — diferencial de mercado: retificação de edital tratada como evento de primeira
        classe, com alerta e resumo de impacto, não como republicação silenciosa.{" "}
        <strong>Exemplo estático</strong> — o algoritmo de diff abaixo é real, mas ainda não há
        retificação real rastreada (isso exige o coletor comparar duas coletas da mesma
        contratação ao longo do tempo — trabalho de v2, ver <code>plan.md</code> do spike 01).
      </p>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        ⚠️ Cláusula de prazo de entrega e de marca alteradas entre a publicação original e a
        retificação — ambas favorecem um fornecedor com estoque prévio local da marca citada.
        Candidato a achado de direcionamento (RN-006 aplicável se virar impugnação).
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 font-mono text-sm leading-relaxed">
        {diff.map((trecho, i) => {
          if (trecho.tipo === "igual") return <span key={i}>{trecho.texto}</span>;
          if (trecho.tipo === "removido")
            return (
              <span key={i} className="bg-red-100 text-red-700 line-through">
                {trecho.texto}
              </span>
            );
          return (
            <span key={i} className="bg-emerald-100 text-emerald-800">
              {trecho.texto}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-neutral-500">
        <span>
          <span className="inline-block h-3 w-3 bg-red-100 align-middle" /> removido
        </span>
        <span>
          <span className="inline-block h-3 w-3 bg-emerald-100 align-middle" /> adicionado
        </span>
      </div>
    </div>
  );
}
