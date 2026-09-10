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
      <h1 className="font-display text-3xl font-semibold text-ink">Perfil do Tenant</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
        Cadastro de catálogo e CNAEs de interesse, persistido no Supabase real.
      </p>

      {error && <p className="mt-4 text-[13px] text-seal-red">{error.message}</p>}

      <div className="mt-8 overflow-x-auto border-y border-line">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-ink-faint">
              <th className="py-2.5 font-medium">Descrição</th>
              <th className="py-2.5 font-medium">CNAE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens?.length ? (
              itens.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 text-ink">{item.descricao}</td>
                  <td className="py-2.5 text-ink-soft">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[12.5px]">{item.cnae ?? "—"}</span>
                      <RemoverItemBotao itemId={item.id} />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="py-4 italic text-ink-faint">
                  Nenhum item de catálogo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ItemCatalogoForm tenantId={tenantId} />

      <div className="mt-8 border-l-2 border-line-strong bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
        <strong className="text-ink">Atestados de capacidade técnica (upload):</strong> ainda não
        disponível nesta tela — o Supabase Storage já existe no projeto (bucket{" "}
        <code className="font-mono text-[12.5px]">editais-documentos</code>), mas reservado a
        documento de edital coletado pelo backend; um bucket separado para upload de atestado do
        próprio tenant ainda não foi criado.
      </div>
    </div>
  );
}
