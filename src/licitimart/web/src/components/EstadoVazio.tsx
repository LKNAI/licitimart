import { estadoVazioClasse } from "@/components/ui";

// Estado "ainda não aconteceu" — deliberadamente distinto de erro (ver
// EstadoErro.tsx): mesma caixa tracejada usada em /retificacoes desde o
// início, agora reutilizada em vez de reescrita por tela.
export default function EstadoVazio({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className={`mt-8 ${estadoVazioClasse}`}>
      {children}
    </div>
  );
}
