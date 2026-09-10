import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import ItemCatalogoForm from "./ItemCatalogoForm";
import RemoverItemBotao from "./RemoverItemBotao";

export default async function TenantPage() {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // middleware já bloqueia isto antes de chegar aqui

  const { data: minhaMembresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!minhaMembresia) return null; // middleware manda pra /onboarding

  const tenantId = minhaMembresia.tenant_id as number;

  const { data: itens, error } = await supabase
    .from("tenant_catalogo_itens")
    .select("id, descricao, cnae")
    .eq("tenant_id", tenantId)
    .order("criado_em", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Perfil do Tenant</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RF-004 — cadastro de catálogo e CNAEs de interesse, persistido no Supabase real.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Descrição</th>
            <th className="py-2">CNAE</th>
          </tr>
        </thead>
        <tbody>
          {itens?.length ? (
            itens.map((item) => (
              <tr key={item.id} className="border-b border-neutral-100">
                <td className="py-2">{item.descricao}</td>
                <td className="py-2 text-neutral-500">
                  <div className="flex items-center justify-between gap-2">
                    <span>{item.cnae ?? "—"}</span>
                    <RemoverItemBotao itemId={item.id} />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="py-3 text-neutral-400">
                Nenhum item de catálogo cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <ItemCatalogoForm tenantId={tenantId} />

      <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
        <strong>Atestados de capacidade técnica (upload):</strong> ainda não disponível nesta tela —
        o Supabase Storage já existe no projeto (bucket <code>editais-documentos</code>, Fase K),
        mas reservado a documento de edital coletado pelo backend; um bucket separado para upload de
        atestado do próprio tenant ainda não foi criado.
      </div>
    </div>
  );
}
