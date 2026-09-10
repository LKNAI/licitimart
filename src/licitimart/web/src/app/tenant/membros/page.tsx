import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import ConvidarForm from "./ConvidarForm";
import PapelSelect from "./PapelSelect";

export default async function MembrosPage() {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // middleware já bloqueia isto antes de chegar aqui

  const { data: minhaMembresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id, papel")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!minhaMembresia) return null; // middleware manda pra /onboarding

  const tenantId = minhaMembresia.tenant_id as number;
  const souAdmin = minhaMembresia.papel === "admin_tenant";

  if (!souAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Membros do Tenant</h1>
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Só administradores do tenant gerenciam membros. Seu papel atual é{" "}
          <strong>{minhaMembresia.papel}</strong>.
        </div>
      </div>
    );
  }

  const { data: membros, error } = await supabase.rpc("listar_membros_tenant", {
    p_tenant_id: tenantId,
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Membros do Tenant</h1>
      <p className="mt-1 text-sm text-neutral-500">
        RNF-007 — gestão de acesso por papel (analista, gestor_comercial, juridico_compliance, admin_tenant).
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">E-mail</th>
            <th className="py-2">Papel</th>
          </tr>
        </thead>
        <tbody>
          {membros?.map((m: { user_id: string; email: string; papel: string }) => (
            <tr key={m.user_id} className="border-b border-neutral-100">
              <td className="py-2">
                {m.email} {m.user_id === user.id && <span className="text-xs text-neutral-400">(você)</span>}
              </td>
              <td className="py-2">
                <PapelSelect
                  tenantId={tenantId}
                  userId={m.user_id}
                  papelAtual={m.papel}
                  ehVoceMesmo={m.user_id === user.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConvidarForm tenantId={tenantId} />
    </div>
  );
}
